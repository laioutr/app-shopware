import { ProductsByCategoryIdQuery } from '@laioutr-core/canonical-types/ecommerce';
import { productsFragmentToken, productVariantsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { resolveRequestedFields } from '../../orchestr-helper/requestedFields';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';

export default defineShopwareQuery(
  ProductsByCategoryIdQuery,
  async ({ context, input, pagination, filter: selectedFilters, sorting, passthrough, requestedComponents, requestedLinks }) => {
    const { categoryId } = input;

    const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters) : {};

    const response = await context.storefrontClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: { categoryId },
      body: {
        page: pagination.page,
        limit: pagination.limit,
        filter: [...(swFilters ?? []), { type: 'equals', field: 'parentId', value: null }],
        order: sorting,
        ...resolveRequestedFields({ requestedComponents, requestedLinks }),
        'total-count-mode': 'exact',
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      },
    });

    passthrough.set(productsFragmentToken, response.data.elements);
    passthrough.set(
      productVariantsFragmentToken,
      response.data.elements.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.parentId ?? curr.id]: curr.children?.length ? curr.children : [curr],
        }),
        {}
      )
    );

    // Shopware API client exposes incorrect types for aggregations :<
    const availableFilters = mapShopwareAggregationToAvailableFilters(response.data.aggregations as unknown as ShopwareAggregations);

    const availableSortings = mapShopwareSortingToOrchestr(response.data.availableSortings);

    return {
      ids: response.data.elements.map((product) => product.id),
      total: response.data.total,
      availableSortings,
      availableFilters,
    };
  }
);
