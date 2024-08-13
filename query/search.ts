import { defineQueryFragmentResolver } from '@laioutr/frontend/kit';
import { z } from 'zod';
import { shopwareClientFactory } from '../data-access/shopware-client-factory';

export default defineQueryFragmentResolver({
  pluginName: '@laioutr/shopware',
  query: 'search',
  fragment: 'products',
  arguments: z.object({
    search: z.string(),
  }),
  resolver: async (args) => {
    const shopwareClient = shopwareClientFactory();
    const products = await shopwareClient.invoke('searchPage post /search', {
      body: {
        search: args.search,
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
