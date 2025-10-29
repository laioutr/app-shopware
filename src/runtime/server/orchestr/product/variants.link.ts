import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context, passthrough }) => {
  const allVariants =
    passthrough.get(productVariantsToken) ??
    (await fetchAllProducts(context.storefrontClient, { productIds: entityIds, loadVariants: true }));

  passthrough.set(productVariantsToken, allVariants);

  return {
    links: entityIds.map((productId) => {
      const product = allVariants.find((variant) => variant.id === productId);
      return {
        sourceId: productId,
        // A products children are its variants. If it has no children, it is a single variant product.
        targetIds: product?.children && product?.children.length > 0 ? product?.children.map((child) => child.id) : [productId],
      };
    }),
  };
});
