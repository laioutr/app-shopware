import type { ShopwareAssociationsQuery, ShopwareIncludesQuery } from './shopware';

export type ShopwareCriteriaTarget = 'product' | 'product-variant' | 'category' | 'menu' | 'product-review';

export interface ShopwareCriteria {
  includes: ShopwareIncludesQuery;
  associations: ShopwareAssociationsQuery;
}

export type ResolveCriteria = (target: ShopwareCriteriaTarget, criteria: ShopwareCriteria) => Promise<ShopwareCriteria>;
