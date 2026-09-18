import { ProductsByCategorySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { cacheProductParentIds } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken, productVariantsToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import {
  mapSelectedFiltersToShopwareFilters,
  mapShopwareAggregationToAvailableFilters,
  ShopwareAggregations,
} from '../../shopware-helper/facetMapper';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';
import { mapShopwareSortingToOrchestr } from '../../shopware-helper/sortingMapper';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery({
  implements: ProductsByCategorySlugQuery,
  cache: {
    ttl: '5 minutes',
    // A transient upstream failure degrades to an empty listing, and caching that would serve an
    // empty category for the whole TTL. Nothing distinguishes it from a category that is genuinely
    // empty, so neither is cached — the cheaper mistake, since an empty listing is rare and costs
    // one upstream call to re-derive.
    validate: ({ value }) => (value && 'ids' in value ? value.ids.length > 0 : false),
    // The product resolver reads its data source from `parentIdToDefaultVariantIdToken`, and a cache
    // hit skips the handler that sets it. Replaying it keeps a hit resolving each tile's default
    // variant rather than its parent, which carries different prices and media.
    includePassthrough: true,
  },
  run: async ({ context, input, pagination, filter: selectedFilters, sorting, passthrough }) => {
    const { categorySlug } = input;
    const seoResolver = useSeoResolver(context.storefrontClient, context.settings.catalog.seoRouteNames);
    const seoEntry = await seoResolver.resolve('category', categorySlug);
    if (!seoEntry) {
      throw new Error(`No seo url found for category slug: ${categorySlug}`);
    }

    const { swFilters, swBuiltInFilters } = selectedFilters ? mapSelectedFiltersToShopwareFilters(selectedFilters, context.swCurrency) : {};

    const response = await context.storefrontClient.invoke('readProductListing post /product-listing/{categoryId}', {
      pathParams: { categoryId: seoEntry.id },
      body: {
        p: pagination.page,
        limit: pagination.limit,
        filter: [...(swFilters ?? [])],
        order: sorting,
        includes: {
          product: ['id', 'parentId'],
        },
        'total-count-mode': context.settings.totalCountMode,
        'min-price': swBuiltInFilters?.['min-price'] as number | undefined,
        'max-price': swBuiltInFilters?.['max-price'] as number | undefined,
        manufacturer: swBuiltInFilters?.manufacturer as string | undefined,
        'shipping-free': swBuiltInFilters?.['shipping-free'] as boolean | undefined,
      },
    });

    // Shopware API client exposes incorrect types for aggregations :<
    const availableFilters = mapShopwareAggregationToAvailableFilters(response.data.aggregations as unknown as ShopwareAggregations, context.swCurrency);
    const availableSortings = mapShopwareSortingToOrchestr(response.data.availableSortings);

    // Tell the product-resolver which variants to use.
    const parentIdToDefaultVariantId = Object.fromEntries(
      response.data.elements.map((product) => [product.parentId ?? product.id, product.id])
    );
    passthrough.set(parentIdToDefaultVariantIdToken, parentIdToDefaultVariantId);

    cacheProductParentIds(response.data.elements.map((product) => [product.id, product.parentId]));

    if (context.settings.loadVariantsOnListing) {
      const allVariants = await fetchAllProducts(context.storefrontClient, {
        productIds: Object.keys(parentIdToDefaultVariantId),
        loadVariants: true,
        resolveCriteria: context.resolveCriteria,
      });
      passthrough.set(productVariantsToken, allVariants);
    }

    return {
      // Return the parent-id, in case the received product is a variant
      ids: response.data.elements.map((product) => product.parentId ?? product.id),
      total: response.data.total,
      availableSortings,
      availableFilters,
    };
  },
});
