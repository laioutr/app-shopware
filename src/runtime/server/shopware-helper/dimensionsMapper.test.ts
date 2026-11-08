import { describe, expect, it } from 'vitest';
import { mapDimensions } from './dimensionsMapper';
import type { ShopwareProduct } from '../types/shopware';

const product = (fields: Record<string, unknown>) => fields as unknown as ShopwareProduct;

describe('mapDimensions', () => {
  it('maps weight and measures in Shopware’s order, with their units', () => {
    expect(mapDimensions(product({ weight: 52.5, width: 2400, height: 850, length: 1000 }), { unit: 'mm', languageCode: 'en-GB' })).toEqual([
      { wellKnownName: 'weight', name: 'Weight', value: { value: 52.5, unit: 'kg' } },
      { wellKnownName: 'width', name: 'Width', value: { value: 2400, unit: 'mm' } },
      { wellKnownName: 'height', name: 'Height', value: { value: 850, unit: 'mm' } },
      { wellKnownName: 'length', name: 'Length', value: { value: 1000, unit: 'mm' } },
    ]);
  });

  it('takes the measures in the unit the shop enters them in, and names them in German for a German request', () => {
    expect(mapDimensions(product({ width: 240 }), { unit: 'cm', languageCode: 'de-DE' })).toEqual([
      { wellKnownName: 'width', name: 'Breite', value: { value: 240, unit: 'cm' } },
    ]);
  });

  it('makes no row for an unset, zero or broken field', () => {
    expect(mapDimensions(product({ weight: null, width: 0, height: Number.NaN, length: '90' }), { unit: 'mm', languageCode: 'de' })).toEqual([]);
    expect(mapDimensions(undefined, { unit: 'mm', languageCode: 'de' })).toEqual([]);
  });
});
