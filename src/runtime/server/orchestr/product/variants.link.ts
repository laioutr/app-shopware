import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';

export default defineShopwareLink({
  implements: ProductVariantsLink,
  cache: {
    // Which variants a sales channel sells is stock-derived, so the stale window is a minute rather
    // than the hour the catalogue reads carry: an upstream outage must not keep offering a
    // discontinued variant for the rest of the day.
    ttl: '10 minutes',
    swr: true,
    staleMaxAge: '1 minute',
  },
  run: async ({ entityIds, context, passthrough }) => {
    const allVariants =
      passthrough.get(productVariantsToken) ??
      (await fetchAllProducts(context.storefrontClient, {
        productIds: entityIds,
        loadVariants: true,
        resolveCriteria: context.resolveCriteria,
        maxLimit: context.settings.maxLimit,
      }));

    passthrough.set(productVariantsToken, allVariants);

    return {
      links: entityIds.map((productId) => {
        const variants = allVariants.filter((variant) => variant.parentId === productId);
        return {
          sourceId: productId,
          // A product's variants are the children this sales channel sells. With none of its own, the
          // product is its single variant.
          targetIds: variants.length > 0 ? variants.map((variant) => variant.id) : [productId],
        };
      }),
    };
  },
});
