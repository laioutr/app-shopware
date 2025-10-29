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
    const parentIdToDefaultVariantId = passthrough.get(parentIdToDefaultVariantIdToken);
    const variantIds = entityIds.map((id) => parentIdToDefaultVariantId?.[id] ?? id);

    const loadedVariants = passthrough.get(productVariantsToken) ?? [];
    const missingVariantIds = variantIds.filter((id) => !loadedVariants.some((variant) => variant.id === id));
    if (missingVariantIds.length > 0) {
      const response = await fetchAllProducts(context.storefrontClient, { productIds: missingVariantIds, loadVariants: false });
      loadedVariants.push(...response);
    }

    const shopwareProducts = variantIds
      .map((id) => loadedVariants.find((variant) => variant.id === id))
      .filter((product): product is NonNullable<typeof product> => !!product);

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
    ttl: '1 day',
    components: {
      prices: {
        ttl: '15 minutes',
      },
    },
  },
});
