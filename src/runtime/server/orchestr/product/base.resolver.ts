import { Money } from '@screeny05/ts-money';
import {
  ProductBase,
  ProductDefaultVariant,
  ProductDescription,
  ProductFlags,
  ProductInfo,
  ProductMedia,
  ProductPrices,
  ProductRating,
  ProductSeo,
} from '@laioutr-core/canonical-types/entity/product';
import { MediaImage } from '@laioutr-core/core-types/common';
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
  provides: [
    ProductBase,
    ProductInfo,
    ProductPrices,
    ProductMedia,
    ProductFlags,
    ProductSeo,
    ProductDescription,
    ProductDefaultVariant,
    ProductRating,
  ],
  resolve: async ({ entityIds, context, $entity, passthrough }) => {
    // If the product has variants, we select the first variant as default data source. In that case the parent might not contain much information.
    // This case only happens if the resolver is called with a product-id that does not exist in parentIdToDefaultVariantId.
    // If you want to influence which variant is selected, passthrough a `parentIdToDefaultVariantIdToken`.
    const parentIdToDefaultVariantId = passthrough.get(parentIdToDefaultVariantIdToken);
    const variantIds = entityIds.map((id) => parentIdToDefaultVariantId?.[id] ?? id);

    const loadedVariants = passthrough.get(productVariantsToken) ?? [];
    // The parent carries the entity's identity, slug and cheapest price, so it is fetched alongside
    // the variant rather than left to whichever link happened to populate the passthrough first.
    const missingIds = [...new Set([...variantIds, ...entityIds])].filter((id) => !loadedVariants.some((variant) => variant.id === id));
    if (missingIds.length > 0) {
      const response = await fetchAllProducts(context.storefrontClient, {
        productIds: missingIds,
        loadVariants: false,
        resolveCriteria: context.resolveCriteria,
        maxLimit: context.settings.maxLimit,
      });
      loadedVariants.push(...response);
    }

    const shopwareProducts = entityIds
      .map((entityId) => {
        const rawVariant = loadedVariants.find((variant) => variant.id === (parentIdToDefaultVariantId?.[entityId] ?? entityId));
        if (!rawVariant) return undefined;
        return {
          entityId,
          rawVariant,
          rawProduct: loadedVariants.find((variant) => variant.id === entityId) ?? rawVariant,
        };
      })
      .filter((product): product is NonNullable<typeof product> => !!product);

    const entities = shopwareProducts.map(({ entityId, rawProduct, rawVariant }) => {
      const mappedCover = rawProduct.cover?.media ? mapMedia(rawVariant.cover?.media ?? rawProduct.cover.media) : FALLBACK_IMAGE;

      return $entity({
        // Answer under the id that was asked for: the queries hand over parent-ids, while the data
        // below is read off the variant they selected.
        id: entityId,

        base: {
          name: swTranslated(rawProduct, 'name'),
          slug: entitySlug(rawProduct),
        },

        defaultVariant: {
          id: rawVariant.id,
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
          const isFirstMediaCover = mappedCover.sources.at(0)?.src === mappedMedia.at(0)?.sources.at(0)?.src;
          // Shopwares product.media does not include the cover, so we add it manually
          const allMedia = isFirstMediaCover ? mappedMedia : [mappedCover, ...mappedMedia];

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

        rating: {
          average: rawProduct.ratingAverage ?? rawVariant.ratingAverage ?? 0,
          count: rawProduct.productReviews?.length ?? 0,
        },
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
