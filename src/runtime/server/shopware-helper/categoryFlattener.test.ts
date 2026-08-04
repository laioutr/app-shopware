import { describe, expect, it } from 'vitest';
import { flattenCategories } from './categoryFlattener';
import type { ShopwareCategory } from '../types/shopware';

const navigationTree = (): ShopwareCategory[] =>
  [
    {
      id: 'root-a',
      children: [
        { id: 'child-a', children: [] },
        { id: 'child-b', children: [] },
      ],
    },
    { id: 'root-b', children: [] },
  ] as unknown as ShopwareCategory[];

describe('flattenCategories', () => {
  it('preserves the order the navigation route returned, parents before their children', () => {
    expect(flattenCategories(navigationTree()).map((category) => category.id)).toEqual(['root-a', 'child-a', 'child-b', 'root-b']);
  });

  it('rewrites parentId so roots have none and children point at their parent', () => {
    const byId = new Map(flattenCategories(navigationTree()).map((category) => [category.id, category]));

    expect(byId.get('root-a')!.parentId).toBeUndefined();
    expect(byId.get('child-b')!.parentId).toBe('root-a');
  });

  it('returns an empty array for an empty tree', () => {
    expect(flattenCategories([])).toEqual([]);
  });
});
