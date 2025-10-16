import { Money } from '@screeny05/ts-money';
import { MediaImage } from '@laioutr-core/canonical-types';
import {
  ProductBase,
  ProductDescription,
  ProductFlags,
  ProductInfo,
  ProductMedia,
  ProductPrices,
  ProductSeo,
} from '@laioutr-core/canonical-types/entity/product';
import { FALLBACK_IMAGE } from '../../const/fallbacks';
import { MediaIncludes } from '../../const/includes';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

/** Add an empty association object to the shopware-request if the component is requested */
const addAssociation = (name: string, add: boolean) => (add ? { [name]: {} } : {});

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductInfo, ProductPrices, ProductMedia, ProductFlags, ProductSeo, ProductDescription],
  resolve: async ({ entityIds, requestedComponents, context, $entity, passthrough }) => {
    const parentIdToDefaultVariantId = passthrough.get(parentIdToDefaultVariantIdToken);
    const variantIds = entityIds.map((id) => {
      const defaultVariantId = parentIdToDefaultVariantId?.[id];
      return defaultVariantId ?? id;
    });

    const response = await context.storefrontClient.invoke('readProduct post /product', {
      body: {
        ids: variantIds,
        associations: {
          ...addAssociation('media', requestedComponents.includes('media')),
          children: {},
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
            'seoUrls',
            'translated',
            'manufacturer',
            'description',
            'children',
          ],
          product_media: ['id', 'mediaId', 'media'],
          media: MediaIncludes,
          property_group_option: ['id', 'name', 'group'],
          property_group: ['id', 'name'],
        },
      },
    });

    const shopwareProducts = response.data.elements ?? [];

    const entities = shopwareProducts.map((rawProduct) => {
      // If the product has variants, we select the first variant as default data source. In that case the parent might not contain much information.
      // This case only happens if the resolver is called with a product-id that does not exist in parentIdToDefaultVariantId.
      // If you want to influence which variant is selected, passthrough a `parentIdToDefaultVariantIdToken`.
      rawProduct = rawProduct.children?.[0] ?? rawProduct;

      const mappedCover = rawProduct.cover?.media ? mapMedia(rawProduct.cover.media) : FALLBACK_IMAGE;

      return $entity({
        // The parent-id is the actual product-id, even if the product has variants.
        id: rawProduct.parentId ?? rawProduct.id,

        base: {
          name: swTranslated(rawProduct, 'name'),
          slug: entitySlug(rawProduct),
        },

        info: {
          cover: mappedCover,
          shortDescription: swTranslated(rawProduct, 'description'),
          brand: swTranslated(rawProduct.manufacturer, 'name'),
        },

        description: { html: swTranslated(rawProduct, 'description') ?? '' },

        seo: {
          title: swTranslated(rawProduct, 'metaTitle'),
          description: swTranslated(rawProduct, 'metaDescription'),
        },

        media: () => {
          const mappedMedia = rawProduct.media?.filter((image) => !!image.media).map((image) => mapMedia(image.media)) ?? [];
          // Shopwares product.media does not include the cover, so we add it manually
          const allMedia = [mappedCover, ...mappedMedia];

          return {
            cover: mappedCover,
            media: allMedia,
            images: allMedia.filter((media) => media.type === 'image') as MediaImage[],
          };
        },

        prices: () => {
          const rawListPrice = rawProduct.calculatedCheapestPrice?.listPrice?.price ?? rawProduct.calculatedPrice.listPrice?.price;
          const listPrice = rawListPrice ? Money.fromDecimal(rawListPrice, context.swCurrency) : undefined;
          const totalPrice = Money.fromDecimal(
            rawProduct.calculatedCheapestPrice?.totalPrice ?? rawProduct.calculatedPrice.totalPrice,
            context.swCurrency
          );

          const hasSavings = typeof listPrice === 'object' && listPrice.greaterThan(totalPrice);

          const savingsPercent = hasSavings ? 100 - totalPrice.percentageOf(listPrice) : undefined;

          return {
            price: totalPrice,
            strikethroughPrice: hasSavings ? listPrice : undefined,
            savingsPercent,
            isOnSale: hasSavings,
            isStartingFrom: rawProduct.calculatedCheapestPrice?.hasRange || rawProduct.calculatedPrice.hasRange,
          };
        },

        flags: [] as any[],
      });
    });

    return { entities };
  },
  cache: {
    strategy: 'ttl',
    ttl: 60 * 60 * 24, // 1 day
  },
});
