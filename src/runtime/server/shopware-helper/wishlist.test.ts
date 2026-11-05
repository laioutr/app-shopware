import { describe, expect, it } from 'vitest';
import { entriesToRemove, wishlistProductId } from './wishlist';

describe('wishlistProductId', () => {
  it('stores a variant as given and a bare product as itself', () => {
    expect(wishlistProductId({ productId: 'p1', variantId: 'v1' })).toBe('v1');
    expect(wishlistProductId({ productId: 'p1' })).toBe('p1');
  });
});

describe('entriesToRemove', () => {
  const entries = [{ id: 'v1', parentId: 'p1' }, { id: 'v2', parentId: 'p1' }, { id: 'p1' }, { id: 'p2' }];

  it('matches a named variant exactly', () => {
    expect(entriesToRemove(entries, { productId: 'p1', variantId: 'v2' })).toEqual(['v2']);
  });

  it('matches a bare product and every variant of it', () => {
    expect(entriesToRemove(entries, { productId: 'p1' })).toEqual(['v1', 'v2', 'p1']);
  });

  it('matches nothing for a product not on the list', () => {
    expect(entriesToRemove(entries, { productId: 'p3' })).toEqual([]);
  });
});
