import { defineQueryFragmentResolver } from '@laioutr/frontend/kit';
import { z } from 'zod';
import { shopwareClientFactory } from '../data-access/shopware-client-factory';

export default defineQueryFragmentResolver({
  pluginName: '@laioutr/shopware',
  query: 'category',
  fragment: 'products',
  arguments: z.object({
    categoryId: z.string(),
  }),
  resolver: async (args) => {
    const shopwareClient = shopwareClientFactory();

    const products = await shopwareClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: {
        categoryId: args.categoryId,
      },
      body: {
        limit: 48,
      },
    });

    return {
      entityIds: [
        {
          entityName: 'ltr:product',
          ids: products.data.elements.map((entity) => entity.id),
        },
      ],
    };
  },
});
