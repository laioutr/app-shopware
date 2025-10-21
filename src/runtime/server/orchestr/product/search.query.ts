import { components } from '@shopware/api-client/api-types';
import { ProductSearchQuery } from '@laioutr-core/canonical-types/ecommerce';
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
  ProductSearchQuery,
  async ({ context, input, pagination, filter: selectedFilters, passthrough, requestedComponents, requestedLinks }) => {
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
        ...resolveRequestedFields({ requestedComponents, requestedLinks }),
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      } as unknown as { search: string } & components['schemas']['ProductListingFlags'],
    });

    passthrough.set(productsFragmentToken, response.data.elements);
    passthrough.set(
      productVariantsFragmentToken,
      response.data.elements.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.parentId ?? curr.id]: curr.children,
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
      availableFilters,
      availableSortings,
    };
  }
);
