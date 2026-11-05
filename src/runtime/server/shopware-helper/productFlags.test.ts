import { describe, expect, it } from 'vitest';
import { deriveProductFlags } from './productFlags';
import type { ShopwareProduct } from '../types/shopware';

const row = (fields: Record<string, unknown> = {}) =>
  ({ calculatedPrice: { totalPrice: 10, unitPrice: 10, listPrice: null }, ...fields }) as unknown as ShopwareProduct;

const variants = (flags: ReturnType<typeof deriveProductFlags>) => flags.map((flag) => flag.variant);

describe('deriveProductFlags', () => {
  it('returns no flags for a plain product', () => {
    expect(deriveProductFlags(row(), row())).toEqual([]);
  });

  it('flags new and topseller products', () => {
    expect(deriveProductFlags(row(), row({ isNew: true, markAsTopseller: true }))).toEqual([
      { variant: 'new', label: 'New' },
      { variant: 'topseller', label: 'Topseller' },
    ]);
  });

  it('lets the parent decide where the variant inherits', () => {
    expect(variants(deriveProductFlags(row({ markAsTopseller: true }), row({ markAsTopseller: null })))).toEqual(['topseller']);
    expect(variants(deriveProductFlags(row({ markAsTopseller: true }), row({ markAsTopseller: false })))).toEqual([]);
  });

  it('flags a sale when the list price is above the price paid', () => {
    const discounted = row({ calculatedPrice: { totalPrice: 80, unitPrice: 80, listPrice: { price: 100 } } });

    expect(variants(deriveProductFlags(discounted, discounted))).toEqual(['sale']);
  });

  it('reads the cheapest price first, like the prices component', () => {
    const product = row({
      calculatedPrice: { totalPrice: 80, unitPrice: 80, listPrice: { price: 100 } },
      calculatedCheapestPrice: { totalPrice: 120, unitPrice: 120, listPrice: { price: 100 } },
    });

    expect(variants(deriveProductFlags(product, row()))).toEqual([]);
  });

  it('does not flag a list price below the price paid', () => {
    const product = row({ calculatedPrice: { totalPrice: 299, unitPrice: 299, listPrice: { price: 279 } } });

    expect(deriveProductFlags(product, product)).toEqual([]);
  });
});
