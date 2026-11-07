import { ProductSearchQuery } from '@laioutr-core/canonical-types/ecommerce';
import type { components } from '../../types/storeApiTypes';
import { cacheProductParentIds } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { listingPageParams, productSearchRoute, warnOnIgnoredLimit } from '../../shopware-helper/shopwareVersion';
import { withSortingFallback } from '../../shopware-helper/sortingFallback';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';

export default defineShopwareQuery(
  ProductSearchQuery,
  async ({ context, input, pagination, filter: selectedFilters, sorting, passthrough }) => {
    const { query } = input;

    const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters, context.swCurrency) : {};

    const route = productSearchRoute(context.shopwareVersion);

    const response = await withSortingFallback(sorting, (order) => {
      // Shopware API client exposes incorrect/incomplete types for these endpoints' bodies :<
      const body = {
        search: query,
        ...listingPageParams(context.shopwareVersion, pagination.page),
        limit: pagination.limit,
        filter: [...(swFilters ?? [])],
        order,
        includes: {
          product: ['id', 'parentId'],
        },
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      } as unknown as { search: string } & components['schemas']['ProductListingCriteria'] & components['schemas']['ProductListingFlags'];

      return route === 'suggest' ?
          context.storefrontClient.invoke('searchSuggest post /search-suggest', { body })
        : context.storefrontClient.invoke('searchPage post /search', { body });
    });

    warnOnIgnoredLimit(route, context.shopwareVersion, {
      requested: pagination.limit,
      effective: response.data.limit,
      maxLimit: context.settings.maxLimit,
    });

    // Shopware API client exposes incorrect types for aggregations :<
    const availableFilters = mapShopwareAggregationToAvailableFilters(
      response.data.aggregations as unknown as ShopwareAggregations,
      context.swCurrency
    );
    const availableSortings = mapShopwareSortingToOrchestr(response.data.availableSortings ?? []);

    // Tell the product-resolver which variants to use.
    const parentIdToDefaultVariantId = Object.fromEntries(
      response.data.elements.map((product) => [product.parentId ?? product.id, product.id])
    );
    passthrough.set(parentIdToDefaultVariantIdToken, parentIdToDefaultVariantId);

    cacheProductParentIds(response.data.elements.map((product) => [product.id, product.parentId]));

    return {
      // Return the parent-id, in case the received product is a variant
      ids: response.data.elements.map((product) => product.parentId ?? product.id),
      total: response.data.total,
      availableFilters,
      availableSortings,
    };
  }
);
