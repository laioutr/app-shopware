import { CategoryProductsQuery } from '@laioutr-core/canonical-types/query';
import { defineShopwareQuery } from '../../../action/defineShopwareAction';
import { mapShopwareSortingToOrchestr } from '../../../shopware-helper/sortingMapper';

export default defineShopwareQuery(CategoryProductsQuery, async ({ context, input, pagination, sorting }) => {
  const swResponse = await context.storefrontClient.invoke('readProductListing post /product-listing/{categoryId}', {
    pathParams: {
      categoryId: input.categoryId,
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
    ids: swResponse.data.elements.map((product) => product.id),
    total: swResponse.data.total,
    availableSortings: mapShopwareSortingToOrchestr(swResponse.data.availableSortings),
  };
});
