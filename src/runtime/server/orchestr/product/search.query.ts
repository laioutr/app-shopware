import { components } from '@shopware/api-client/api-types';
import { ProductSearchQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';

export default defineShopwareQuery(ProductSearchQuery, async ({ context, input, pagination, filter: selectedFilters }) => {
  const { query } = input;

  const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters) : {};

  const response = await context.storefrontClient.invoke('searchSuggest post /search-suggest', {
    // Shopware API client exposes incorrect/incomplete types for this endpoint's body :<
    body: {
      search: query,
      /* FIXME: SDK is ignoring pagination for this endpoint */
      page: pagination.page,
      limit: pagination.limit,
      filter: [...(swFilters ?? []), { type: 'equals', field: 'parentId', value: null }],
      includes: {
        product: ['id'],
      },
      'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
      'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
      manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
      'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
    } as unknown as { search: string } & components['schemas']['ProductListingFlags'],
  });

  // Shopware API client exposes incorrect types for aggregations :<
  const availableFilters = mapShopwareAggregationToAvailableFilters(response.data.aggregations as unknown as ShopwareAggregations);

  return {
    ids: response.data.elements.map((product) => product.id),
    total: response.data.total,
    availableSortings: [],
    availableFilters,
  };
});
