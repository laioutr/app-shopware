import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context, passthrough }) => {
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
});
