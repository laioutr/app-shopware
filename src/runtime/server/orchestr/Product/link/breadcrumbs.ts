import { defineLinkResolver } from '#imports';
import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

export default defineLinkResolver({
  label: 'Shopware Product Breadcrumb Connector',
  sourceEntityType: 'Product',
  targetEntityType: 'Category',
  linkName: 'breadcrumbs',
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
      links: matchAndMap(
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
