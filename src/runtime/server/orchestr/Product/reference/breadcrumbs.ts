import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

export default defineReferenceResolver({
  label: 'Shopware Product Breadcrumb Connector',
  sourceEntityType: 'Product',
  targetEntityType: 'Category',
  referenceName: 'breadcrumbs',
  resolve: async ({ entityIds }) => {
    const shopwareClient = await shopwareClientFactory();
    const swResponse = await shopwareClient.invoke('readProduct post /product', {
      body: {
        ids: entityIds,
        associations: {
          categories: {},
        },
      },
    });
    const shopwareProducts = swResponse.data.elements ?? [];

    return {
      references: matchAndMap(
        entityIds,
        shopwareProducts,
        (id, product) => product.id === id,
        (product) => ({
          entityIds: [...(product.categoryTree ?? [])],
        })
      ),
    };
  },
});
