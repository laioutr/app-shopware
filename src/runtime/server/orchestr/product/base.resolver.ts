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
import { parentIdToDefaultVariantIdToken, productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductInfo, ProductPrices, ProductMedia, ProductFlags, ProductSeo, ProductDescription],
  resolve: async ({ entityIds, context, $entity, passthrough }) => {
    // If the product has variants, we select the first variant as default data source. In that case the parent might not contain much information.
    // This case only happens if the resolver is called with a product-id that does not exist in parentIdToDefaultVariantId.
    // If you want to influence which variant is selected, passthrough a `parentIdToDefaultVariantIdToken`.
    const parentIdToDefaultVariantId = passthrough.get(parentIdToDefaultVariantIdToken);
    const variantIds = entityIds.map((id) => parentIdToDefaultVariantId?.[id] ?? id);

    const loadedVariants = passthrough.get(productVariantsToken) ?? [];
    const missingVariantIds = variantIds.filter((id) => !loadedVariants.some((variant) => variant.id === id));
    if (missingVariantIds.length > 0) {
      const response = await fetchAllProducts(context.storefrontClient, { productIds: missingVariantIds, loadVariants: false });
      loadedVariants.push(...response);
    }

    const shopwareProducts = variantIds
      .map((id) => {
        const rawVariant = loadedVariants.find((variant) => variant.id === id);
        if (!rawVariant) return undefined;
        return {
          rawVariant,
          rawProduct: loadedVariants.find((variant) => variant.id === variant.parentId) ?? rawVariant,
        };
      })
      .filter((product): product is NonNullable<typeof product> => !!product);

    const entities = shopwareProducts.map(({ rawProduct, rawVariant }) => {
      const mappedCover = rawProduct.cover?.media ? mapMedia(rawVariant.cover?.media ?? rawProduct.cover.media) : FALLBACK_IMAGE;

      return $entity({
        // The parent-id is the actual product-id, even if the product has variants.
        id: rawProduct.id,

        base: {
          name: swTranslated(rawProduct, 'name'),
          slug: entitySlug(rawProduct),
          defaultVariantId: rawVariant.id,
        },

        info: {
          cover: mappedCover,
          shortDescription: swTranslated(rawProduct, 'description') || swTranslated(rawVariant, 'description'),
          brand: swTranslated(rawProduct.manufacturer, 'name') || swTranslated(rawVariant.manufacturer, 'name') || '',
        },

        description: {
          html: swTranslated(rawProduct, 'description') || swTranslated(rawVariant, 'description') || '',
        },

        seo: {
          title: swTranslated(rawProduct, 'metaTitle') || swTranslated(rawVariant, 'metaTitle'),
          description: swTranslated(rawProduct, 'metaDescription') || swTranslated(rawVariant, 'metaDescription'),
        },

        media: () => {
          const mappedMedia =
            (rawProduct.media ?? rawVariant.media)?.filter((image) => !!image.media).map((image) => mapMedia(image.media)) ?? [];
          // Shopwares product.media does not include the cover, so we add it manually
          const allMedia = [mappedCover, ...mappedMedia];

          return {
            cover: mappedCover,
            media: allMedia,
            images: allMedia.filter((media) => media.type === 'image') as MediaImage[],
          };
        },

        prices: () => {
          const rawListPrice =
            rawProduct.calculatedCheapestPrice?.listPrice?.price ??
            rawProduct.calculatedPrice.listPrice?.price ??
            rawVariant.calculatedCheapestPrice?.listPrice?.price ??
            rawVariant.calculatedPrice.listPrice?.price;
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
    ttl: '1 day',
    components: {
      prices: {
        ttl: '15 minutes',
      },
    },
  },
});
