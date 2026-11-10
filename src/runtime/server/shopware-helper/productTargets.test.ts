import { describe, expect, it } from 'vitest';
import { productTargetsOf } from './productTargets';

describe('productTargetsOf', () => {
  it('links a variant row as its product, and remembers the variant to show', () => {
    expect(productTargetsOf([{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }])).toEqual({
      targetIds: ['p-1', 'p-2'],
      defaultVariantIds: { 'p-1': 'v-1', 'p-2': 'p-2' },
    });
  });

  it('keeps each product once, at its first row', () => {
    expect(productTargetsOf([{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }, { id: 'v-2', parentId: 'p-1' }, { id: 'p-2' }])).toEqual({
      targetIds: ['p-1', 'p-2'],
      defaultVariantIds: { 'p-1': 'v-1', 'p-2': 'p-2' },
    });
  });
});
