import { ProductsByCategorySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery(
  ProductsByCategorySlugQuery,
  async ({ context, input, pagination, filter: selectedFilters, sorting }) => {
    const { categorySlug } = input;
    const seoResolver = useSeoResolver(context.storefrontClient);
    const seoEntry = await seoResolver.resolve('category', categorySlug);
    if (!seoEntry) {
      throw new Error(`No seo url found for category slug: ${categorySlug}`);
    }

    const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters) : {};

    const response = await context.storefrontClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: { categoryId: seoEntry.id },
      body: {
        page: pagination.page,
        limit: pagination.limit,
        filter: [
          ...(swFilters ?? []),
          // Fetch parent-products, not child-products (e.g. variants)
          { type: 'equals', field: 'parentId', value: null },
        ],
        order: sorting,
        includes: {
          product: ['id'],
        },
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      },
    });

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
