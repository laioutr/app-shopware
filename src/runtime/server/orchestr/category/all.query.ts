import { CategoryAllQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';

export default defineShopwareQuery({
  implements: CategoryAllQuery,
  cache: {
    ttl: '1 hour',
    swr: true,
    staleMaxAge: '1 hour',
  },
  run: async ({ context, pagination }) => {
    const { storefrontClient } = context;

    const response = await storefrontClient.invoke('readCategoryList post /category', {
      body: {
        page: pagination.page,
        limit: pagination.limit,
        includes: {
          category: ['id'],
        },
      },
    });

    return { ids: (response.data.elements ?? [])?.map((element) => element.id) };
  },
});
