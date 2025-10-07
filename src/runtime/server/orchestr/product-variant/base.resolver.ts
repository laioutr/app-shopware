import { Money } from '@screeny05/ts-money';
import { MediaImage } from '@laioutr-core/canonical-types';
import {
  ProductVariantAvailability,
  ProductVariantBase,
  ProductVariantInfo,
  ProductVariantOptions,
  ProductVariantPrices,
  ProductVariantQuantityPrices,
  ProductVariantQuantityRule,
  ProductVariantShipping,
} from '@laioutr-core/canonical-types/entity/product-variant';
import { MediaIncludes } from '../../const/includes';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { mapMedia } from '../../shopware-helper/mediaMapper';

export default defineShopwareComponentResolver({
  entityType: 'ProductVariant',
  label: 'Shopware Product Variant Connector',
  provides: [
    ProductVariantBase,
    ProductVariantInfo,
    ProductVariantAvailability,
    ProductVariantPrices,
    ProductVariantQuantityPrices,
    ProductVariantQuantityRule,
    ProductVariantShipping,
    ProductVariantOptions,
  ],
  resolve: async ({ entityIds, context, clientEnv, $entity }) => {
    const { currency } = clientEnv;

    const response = await context.storefrontClient.invoke('readProduct post /product', {
      body: {
        ids: entityIds,
        associations: {
          cover: { associations: { media: {} } }, // main image
          media: { associations: { media: {} } }, // gallery images (via product_media -> media)
          options: { associations: { group: {} } }, // variant options like Color/Size + their group names
        },
        includes: {
          product: [
            'id',
            'parentId',
            'name',
            'productNumber',
            'ean',
            'available',
            'availableStock',
            'stock',
            'minPurchase',
            'purchaseSteps',
            'maxPurchase',
            'calculatedPrice',
            'calculatedPrices',
            'cover',
            'media',
            'options',
            'optionIds',
          ],
          product_media: ['id', 'mediaId', 'media'],
          media: MediaIncludes,
          property_group_option: ['id', 'name', 'group'],
          property_group: ['id', 'name'],
        },
      },
    });

    return {
      entities: (response.data.elements ?? []).map((entity) =>
        $entity({
          id: entity.id,

          base: () => ({
            // Shopware SKU/product number
            sku: entity.productNumber ?? entity.ean ?? entity.id,
            name: entity.name,
            // Shopware stores GTIN/EAN in `ean`
            gtin: entity.ean ?? undefined,
          }),

          availability: () => ({
            status: entity.available ? 'inStock' : 'outOfStock',
            // Prefer availableStock if you include it; fallback to stock
            quantity: entity.availableStock ?? entity.stock ?? 0,
          }),

          prices: () => {
            // Main price from Store API
            const unit = entity.calculatedPrice?.unitPrice ?? 0;

            // "Compare at" (strike-through) in Shopware = listPrice on calculatedPrice
            const listPrice = entity.calculatedPrice?.listPrice?.price;
            const price = Money.fromDecimal(Number(unit), currency);

            const compareAtPrice =
              typeof listPrice === 'number' && listPrice > unit ? Money.fromDecimal(Number(listPrice), currency) : undefined;

            // Reference/unit pricing (price per X unit)
            // Shopware: calculatedPrice.referencePrice { price, purchaseUnit, referenceUnit, unitName }
            const rp = entity.calculatedPrice?.referencePrice;

            return {
              price,
              isOnSale: !!compareAtPrice,
              strikethroughPrice: compareAtPrice,
              savingsPercent: compareAtPrice ? 100 - price.percentageOf(compareAtPrice) : undefined,

              unitPrice:
                rp ?
                  {
                    quantity: {
                      value: rp.purchaseUnit ?? 1,
                      // if you have your own unit normalizer, call it here
                      unit: rp.unitName ?? rp.referenceUnit ?? undefined,
                    },
                    price: Money.fromDecimal(Number(rp.price), currency),
                    reference: {
                      value: rp.referenceUnit ?? 1,
                      unit: rp.unitName ?? rp.referenceUnit ?? undefined,
                    },
                  }
                : undefined,
            };
          },

          info: () => {
            const allMedia = (entity.media ?? []).map((m) => m.media);
            const media = entity.cover?.media ? [entity.cover.media, ...allMedia] : allMedia;

            return {
              image: media.map(mapMedia).find((m) => m.type === 'image') as MediaImage | undefined,
            };
          },

          // Tiered/quantity prices:
          // Shopware exposes calculatedPrices[] for price tiers (quantityStart/End etc.)
          quantityPrices: () => {
            const baseUnit = entity.calculatedPrice?.unitPrice ?? 0;
            const base = Money.fromDecimal(Number(baseUnit), currency);

            const tiers = Array.isArray(entity.calculatedPrices) ? entity.calculatedPrices : [];

            return tiers.map((cp) => {
              const tierUnit = cp?.unitPrice ?? baseUnit;
              const price = Money.fromDecimal(Number(tierUnit), currency);

              // Prefer quantityStart if present; fall back to cp.quantity or 1
              const qty = cp?.quantity ?? 1;

              return {
                quantity: qty,
                price,
                savingsPercent: price.percentageOf(base),
              };
            });
          },

          quantityRule: () => ({
            min: entity.minPurchase ?? 1,
            increment: entity.purchaseSteps ?? 1,
            max: entity.maxPurchase ?? undefined,
          }),

          shipping: () => ({
            // Shopware doesn’t expose a direct "requiresShipping" boolean.
            // If you track virtual/downloadable yourself, plug it here.
            // Otherwise assume physical → requires shipping.
            required: true,
          }),

          options: () => ({
            selected:
              entity.options?.map((option) => ({
                name: option.group?.name ?? option.name,
                value: option.name ?? option.option,
              })) ?? [],
          }),
        })
      ),
    };
  },
});
