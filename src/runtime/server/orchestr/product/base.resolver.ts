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
import { productsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { resolveRequestedFields } from '../../orchestr-helper/requestedFields';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductInfo, ProductPrices, ProductMedia, ProductFlags, ProductSeo, ProductDescription],
  resolve: async ({ entityIds, requestedComponents, context, $entity, passthrough }) => {
    const response =
      passthrough.has(productsFragmentToken) ?
        { data: { elements: passthrough.get(productsFragmentToken) ?? [] } }
      : await context.storefrontClient.invoke('readProduct post /product', {
          body: {
            ids: entityIds,
            ...resolveRequestedFields({ requestedComponents, requestedLinks: {} }),
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
    ttl: '1 day',
    components: {
      prices: {
        ttl: '15 minutes',
      },
    },
  },
});
