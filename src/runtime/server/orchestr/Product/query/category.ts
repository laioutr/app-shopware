import { z } from 'zod';
import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { mapShopwareSortingToOrchestr } from '../../../shopware-helper/sortingMapper';

export default defineQueryHandler({
  queryName: 'category',
  label: 'Shopware Demo Category Product Resolver',
  entityType: 'LtrProduct',
  arguments: z.object({
    categoryId: z.string(),
  }),
  defaultLimit: 48,
  handle: async ({ arguments: args, pagination, sorting }) => {
    const shopwareClient = shopwareClientFactory();

    const swResponse = await shopwareClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: {
        categoryId: args.categoryId,
      },
      body: {
        limit: pagination.limit,
        p: pagination.page,
        includes: {
          product: ['id'],
        },
        order: sorting,
      },
    });

    return {
      entityIds: swResponse.data.elements.map((product) => product.id),
      entityTotal: swResponse.data.total,
      availableSortings: mapShopwareSortingToOrchestr(swResponse.data.availableSortings),
    };
  },
});
