import { describe, expect, it } from 'vitest';
import { deriveProductFlags } from './productFlags';
import type { ShopwareProduct } from '../types/shopware';

const row = (fields: Record<string, unknown> = {}) =>
  ({ calculatedPrice: { totalPrice: 10, unitPrice: 10, listPrice: null }, ...fields }) as unknown as ShopwareProduct;

const codes = (flags: ReturnType<typeof deriveProductFlags>) => flags.map((flag) => flag.wellKnownName);

describe('deriveProductFlags', () => {
  it('returns no flags for a plain product', () => {
    expect(deriveProductFlags(row(), row())).toEqual([]);
  });

  it('flags new and topseller products with their well-known codes', () => {
    expect(deriveProductFlags(row(), row({ isNew: true, markAsTopseller: true }))).toEqual([
      { wellKnownName: 'new', name: 'New' },
      { wellKnownName: 'recommended', name: 'Tip' },
    ]);
  });

  it('lets the parent decide where the variant inherits', () => {
    expect(codes(deriveProductFlags(row({ markAsTopseller: true }), row({ markAsTopseller: null })))).toEqual(['recommended']);
    expect(codes(deriveProductFlags(row({ markAsTopseller: true }), row({ markAsTopseller: false })))).toEqual([]);
  });

  it('leaves a discount to the prices component', () => {
    const discounted = row({ calculatedPrice: { totalPrice: 80, unitPrice: 80, listPrice: { price: 100 } } });

    expect(deriveProductFlags(discounted, discounted)).toEqual([]);
  });
});
