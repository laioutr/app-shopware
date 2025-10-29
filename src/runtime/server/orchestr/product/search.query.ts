import { components } from '@shopware/api-client/api-types';
import { ProductSearchQuery } from '@laioutr-core/canonical-types/ecommerce';
import { cacheProductParentIds } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';

export default defineShopwareQuery(ProductSearchQuery, async ({ context, input, pagination, filter: selectedFilters, passthrough }) => {
  const { query } = input;

  const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters) : {};

  const response = await context.storefrontClient.invoke('searchSuggest post /search-suggest', {
    // Shopware API client exposes incorrect/incomplete types for this endpoint's body :<
    body: {
      search: query,
      p: pagination.page,
      limit: pagination.limit,
      filter: [...(swFilters ?? [])],
      includes: {
        product: ['id', 'parentId'],
      },
      'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
      'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
      manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
      'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
    } as unknown as { search: string } & components['schemas']['ProductListingFlags'],
  });

  // Shopware API client exposes incorrect types for aggregations :<
  const availableFilters = mapShopwareAggregationToAvailableFilters(response.data.aggregations as unknown as ShopwareAggregations);
  const availableSortings = mapShopwareSortingToOrchestr(response.data.availableSortings);

  // Tell the product-resolver which variants to use.
  const parentIdToDefaultVariantId = Object.fromEntries(
    response.data.elements.map((product) => [product.parentId ?? product.id, product.id])
  );
  passthrough.set(parentIdToDefaultVariantIdToken, parentIdToDefaultVariantId);

  cacheProductParentIds(response.data.elements.map((product) => [product.id, product.parentId ?? product.id]));

  return {
    // Return the parent-id, in case the received product is a variant
    ids: response.data.elements.map((product) => product.parentId ?? product.id),
    total: response.data.total,
    availableFilters,
    availableSortings,
  };
});
