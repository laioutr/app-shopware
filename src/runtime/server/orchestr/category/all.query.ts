import { CategoryAllQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';

export default defineShopwareQuery(CategoryAllQuery, async ({ context, pagination }) => {
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
});
