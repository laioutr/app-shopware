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

  it('leaves out the excluded product, also when a sibling variant of it is answered', () => {
    expect(
      productTargetsOf([{ id: 'v-own-2', parentId: 'p-own' }, { id: 'v-own-1' }, { id: 'p-3' }], ['p-own', 'v-own-1']).targetIds
    ).toEqual(['p-3']);
  });
});
