import { Money } from '@screeny05/ts-money';
import {
  ProductBase,
  ProductBrand,
  ProductDefaultVariant,
  ProductDescription,
  ProductFlags,
  ProductInfo,
  ProductMedia,
  ProductOptionGroups,
  ProductPrices,
  ProductRating,
  ProductSeo,
  ProductSpecifications,
} from '@laioutr-core/canonical-types/entity/product';
import { MediaImage } from '@laioutr-core/core-types/common';
import type { ShopwareProduct } from '../../types/shopware';
import { FALLBACK_IMAGE } from '../../const/fallbacks';
import { parentIdToDefaultVariantIdToken, productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { resolveProductPropertyFields } from '../../orchestr-helper/requestedFields';
import { toRequestCriteria } from '../../shopware-helper/criteria';
import { pickCustomFields } from '../../shopware-helper/customFields';
import { mapDimensions } from '../../shopware-helper/dimensionsMapper';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';
import { mapManufacturerBrand } from '../../shopware-helper/manufacturerMapper';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { mapProductOptionGroups } from '../../shopware-helper/optionGroupsMapper';
import { deriveProductFlags } from '../../shopware-helper/productFlags';
import { savingsPercentOf } from '../../shopware-helper/savingsPercent';
import { mapSpecifications } from '../../shopware-helper/specificationsMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [
    ProductBase,
    ProductBrand,
    ProductInfo,
    ProductPrices,
    ProductMedia,
    ProductFlags,
    ProductSeo,
    ProductDescription,
    ProductDefaultVariant,
    ProductOptionGroups,
    ProductRating,
    ProductSpecifications,
  ],
  resolve: async ({ entityIds, context, clientEnv, requestedComponents, $entity, passthrough }) => {
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

    // Read off the variant the rest of the projection uses, which inherits the parent's properties
    // and dimensions where it has none of its own.
    const specificationsByVariantId = new Map<string, ShopwareProduct>();
    if (requestedComponents.includes('specifications') && shopwareProducts.length > 0) {
      const criteria = await resolveProductPropertyFields(context.resolveCriteria);
      const response = await context.storefrontClient.invoke('readProduct post /product', {
        body: {
          ids: shopwareProducts.map(({ rawVariant }) => rawVariant.id),
          ...toRequestCriteria(criteria),
        },
      });
      for (const element of response.data.elements ?? []) specificationsByVariantId.set(element.id, element);
    }

    const entities = shopwareProducts.map(({ entityId, rawProduct, rawVariant }) => {
      const mappedCover = rawProduct.cover?.media ? mapMedia(rawVariant.cover?.media ?? rawProduct.cover.media) : FALLBACK_IMAGE;
      // Shopware inherits the manufacturer, so a variant without its own reports the parent's.
      const brand = mapManufacturerBrand(rawVariant.manufacturer ?? rawProduct.manufacturer);

      return $entity({
        // Answer under the id that was asked for: the queries hand over parent-ids, while the data
        // below is read off the variant they selected.
        id: entityId,

        base: {
          name: swTranslated(rawProduct, 'name'),
          slug: entitySlug(rawProduct),
          customFields: pickCustomFields(rawProduct, context.customFields, 'product'),
        },

        defaultVariant: {
          id: rawVariant.id,
          sku: rawVariant.productNumber ?? undefined,
          // Typed locally because the resolver hands `rawVariant` back as `any`.
          options: (rawVariant.options as ShopwareProduct['options'])
            ?.map((option) => swTranslated(option, 'name') ?? '')
            .filter(Boolean),
          status: rawVariant.available ? 'inStock' : 'outOfStock',
        },

        // The configurator hangs off the parent, never the variant the rest of this
        // projection reads from.
        optionGroups: mapProductOptionGroups(rawProduct),

        info: {
          cover: mappedCover,
          shortDescription: swTranslated(rawProduct, 'description') || swTranslated(rawVariant, 'description'),
          brand: brand.name ?? '',
          brandLink: brand.link,
        },

        brand,

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
          const listPrice = rawListPrice ? Money.fromDecimal(rawListPrice, context.currency) : undefined;
          const totalPrice = Money.fromDecimal(
            rawProduct.calculatedCheapestPrice?.totalPrice ?? rawProduct.calculatedPrice.totalPrice,
            context.currency
          );

          const hasSavings = typeof listPrice === 'object' && listPrice.greaterThan(totalPrice);

          return {
            price: totalPrice,
            strikethroughPrice: hasSavings ? listPrice : undefined,
            savingsPercent: savingsPercentOf(totalPrice, listPrice),
            isOnSale: hasSavings,
            isStartingFrom: rawProduct.calculatedCheapestPrice?.hasRange || rawProduct.calculatedPrice.hasRange,
          };
        },

        flags: () => ({ flags: deriveProductFlags(rawProduct, rawVariant) }),

        specifications: () => {
          const row = specificationsByVariantId.get(rawVariant.id);
          const properties = mapSpecifications(row?.properties);
          // A property group that already names a dimension wins over the native field.
          const named = new Set(properties.map((property) => property.wellKnownName));
          const dimensions = mapDimensions(row, { unit: context.dimensionUnit, languageCode: clientEnv.language.code }).filter(
            (dimension) => !named.has(dimension.wellKnownName)
          );
          return { properties: [...dimensions, ...properties] };
        },

        rating: {
          average: rawProduct.ratingAverage ?? rawVariant.ratingAverage ?? 0,
          count: rawProduct.productReviews?.length ?? 0,
        },
      });
    });

    // Shopware leaves out a product it does not sell in this sales channel, such as one deactivated after its
    // slug was cached. A failed request throws instead, so an outage never reads as not found.
    const found = new Set(shopwareProducts.map((product) => product.entityId));
    return { entities, notFound: entityIds.filter((entityId) => !found.has(entityId)) };
  },
  cache: {
    ttl: '1 day',
    swr: true,
    staleMaxAge: '1 hour',
    components: {
      // A price is what the visitor is asked to pay, so its stale window is a minute rather than the
      // resolver's hour: an upstream outage must not keep quoting an old one all day.
      prices: {
        ttl: '15 minutes',
        swr: true,
        staleMaxAge: '1 minute',
      },
      // Half of it is stock-derived, so it decays like prices rather than living for
      // the resolver's full day. `optionGroups` needs no override: nothing in it is.
      defaultVariant: {
        ttl: '15 minutes',
        swr: true,
        staleMaxAge: '1 minute',
      },
    },
  },
});
