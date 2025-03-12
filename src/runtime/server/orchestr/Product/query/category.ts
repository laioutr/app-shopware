import { z } from 'zod';
import { defineQueryHandler } from '#imports';
import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { mapShopwareSortingToOrchestr } from '../../../shopware-helper/sortingMapper';

export default defineQueryHandler({
  app: '@laioutr-app/shopware',
  queryName: 'category',
  label: 'Shopware Category Products',
  description: 'Fetch products from a specific category',
  entityType: 'Product',
  arguments: z.object({
    categoryId: z.string().describe('The category id to fetch products from'),
  }),
  defaultLimit: 48,
  handle: async ({ args, pagination, sorting }) => {
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
