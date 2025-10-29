import { ProductsByCategoryIdQuery } from '@laioutr-core/canonical-types/ecommerce';
import { cacheProductParentIds } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';

export default defineShopwareQuery(
  ProductsByCategoryIdQuery,
  async ({ context, input, pagination, filter: selectedFilters, sorting, passthrough }) => {
    const { categoryId } = input;

    const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters) : {};

    const response = await context.storefrontClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: { categoryId },
      body: {
        page: pagination.page,
        limit: pagination.limit,
        filter: [...(swFilters ?? [])],
        order: sorting,
        includes: {
          product: ['id', 'parentId'],
        },
        'total-count-mode': 'exact',
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      },
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
      availableSortings,
      availableFilters,
    };
  }
);
