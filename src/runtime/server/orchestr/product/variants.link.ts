import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context }) => {
  const response = await context.storefrontClient.invoke('readProduct post /product', {
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

  return {
    links: (response.data.elements ?? []).map((product) => ({
      sourceId: product.id,
      targetIds: product.children?.map((child) => child.id) ?? [product.id],
    })),
  };
});
