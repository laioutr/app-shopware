import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { productVariantsFragmentToken, variantsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context, passthrough }) => {
  const response =
    passthrough.has(productVariantsFragmentToken) ?
      {
        data: {
          elements: Object.entries(passthrough.get(productVariantsFragmentToken)!).map(([productId, variants]) => ({
            id: productId,
            children: variants,
          })),
        },
      }
    : await context.storefrontClient.invoke('readProduct post /product', {
        body: {
          ids: entityIds,
          associations: {
            // load children (variants) for each parent:
            children: {
              associations: {
                options: { associations: { group: {} } }, // resolve Color/Size labels
              },
            },
          },
          includes: { product: ['id', 'children'] },
        },
      });

  if (passthrough.has(productVariantsFragmentToken))
    passthrough.set(
      variantsFragmentToken,
      (response.data.elements ?? []).flatMap((el) => el.children)
    );

  return {
    links: (response.data.elements ?? []).map((product) => ({
      sourceId: product.id,
      // A products children are its variants. If it has no children, it is a single variant product.
      targetIds: product.children && product.children.length > 0 ? product.children.map((child) => child.id) : [product.id],
    })),
  };
});
