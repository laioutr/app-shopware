import { AvailableFilter, isRangeFilter, QueryWireRequestFilter } from '#orchestr/types';
import { ShopwareFilters } from '../types/shopware';

export type ShopwareAggregationKey = 'price' | 'shipping-free' | 'manufacturer';
export interface ShopwareAggregation {
  name: string;
  min?: number;
  max?: number;
  entities?: Array<{ id: string; name: string }>;
}
export type ShopwareAggregations = Record<ShopwareAggregationKey, ShopwareAggregation>;

export const mapShopwareAggregationToAvailableFilters = (facets: ShopwareAggregations): AvailableFilter[] => {
  const filters = [] as AvailableFilter[];

  const listFacets = ['manufacturer'] as ShopwareAggregationKey[];
  const rangeFacets = ['price'] as ShopwareAggregationKey[];
  const booleanFacets = ['shipping-free'] as ShopwareAggregationKey[];

  // eslint-disable-next-line guard-for-in
  for (const facet in facets) {
    const facetKey = facet as ShopwareAggregationKey;
    const facetObj = facets[facet as ShopwareAggregationKey];

    if (listFacets.includes(facetKey)) {
      filters.push({
        id: facetObj.name,
        label: facetObj.name,
        type: 'list',
        presentation: 'text',
        values: (facetObj.entities ?? []).map((entity) => ({ id: entity.id, label: entity.name })),
      });
    } else if (rangeFacets.includes(facetKey)) {
      filters.push({
        id: facetObj.name,
        label: facetObj.name,
        type: 'range',
        min: facetObj.min ?? 0,
        max: facetObj.max ?? 0,
      });
    } else if (booleanFacets.includes(facetKey)) {
      filters.push({
        id: facetObj.name,
        label: facetObj.name,
        type: 'boolean',
      });
    }
  }

  return filters;
};

/* Unfortunately in Shopware there is a concept of dedicated filters and not dynamic filters for some fields so we have to take them into consideration */
export const mapSelectedFiltersToShopwareFilters = (filters: QueryWireRequestFilter) => {
  const swFilters = [] as ShopwareFilters;
  const swBuiltInFilters = {} as Record<
    'min-price' | 'max-price' | 'manufacturer' | 'shipping-free',
    number | string | boolean | undefined
  >;

  // eslint-disable-next-line guard-for-in
  for (const filter in filters) {
    const filterObj = filters[filter];

    if (isRangeFilter(filterObj)) {
      if (filter === 'price') {
        swBuiltInFilters['min-price'] = filterObj.min;
        swBuiltInFilters['max-price'] = filterObj.max;
      } else {
        swFilters.push({
          type: 'range',
          field: filter,
          parameters: {
            lte: filterObj.max,
            gte: filterObj.min,
          },
        });
      }
    } else if (typeof filterObj === 'boolean') {
      if (filter === 'shipping-free') {
        swBuiltInFilters['shipping-free'] = filterObj;
      } else {
        swFilters.push({
          type: 'equals',
          field: filter,
          value: filterObj,
        });
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (filter === 'manufacturer') {
        swBuiltInFilters.manufacturer = filterObj.join('|');
      } else {
        swFilters.push({
          type: 'equalsAny',
          field: filter,
          value: filterObj.join('|'),
        });
      }
    }
  }

  return { swFilters, swBuiltInFilters };
};
