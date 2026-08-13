import { describe, expect, it } from 'vitest';
import { mergeIncludes, toRequestCriteria } from './criteria';

describe('mergeIncludes', () => {
  it('unions the fields of an entity both projections name', () => {
    expect(mergeIncludes({ product: ['id', 'name'] }, { product: ['name', 'customFields'] })).toEqual({
      product: ['id', 'name', 'customFields'],
    });
  });

  it('keeps entities only one projection names', () => {
    expect(mergeIncludes({ product: ['id'] }, { media: ['url'] })).toEqual({ product: ['id'], media: ['url'] });
  });

  it('never drops a field either projection requested', () => {
    const product = { product: ['id', 'calculatedPrice'], media: ['url'] };
    const variant = { product: ['optionIds'] };

    const merged = mergeIncludes(product, variant);

    expect(merged.product).toEqual(expect.arrayContaining([...product.product, ...variant.product]));
    expect(merged.media).toEqual(['url']);
  });

  it('leaves the inputs untouched', () => {
    const projection = { product: ['id'] };
    mergeIncludes(projection, { product: ['optionIds'] });
    expect(projection).toEqual({ product: ['id'] });
  });

  it('returns an empty projection for no inputs', () => {
    expect(mergeIncludes()).toEqual({});
  });
});

describe('toRequestCriteria', () => {
  it('carries both halves when both are populated', () => {
    expect(toRequestCriteria({ includes: { product: ['id'] }, associations: { cover: {} } })).toEqual({
      includes: { product: ['id'] },
      associations: { cover: {} },
    });
  });

  it('omits an empty includes so a read that projects nothing keeps returning whole rows', () => {
    expect(toRequestCriteria({ includes: {}, associations: { seoUrls: {}, media: {} } })).toEqual({
      associations: { seoUrls: {}, media: {} },
    });
  });

  it('omits empty associations', () => {
    expect(toRequestCriteria({ includes: { product_review: ['id'] }, associations: {} })).toEqual({
      includes: { product_review: ['id'] },
    });
  });

  it('yields an empty body fragment when a hook emptied both halves', () => {
    expect(toRequestCriteria({ includes: {}, associations: {} })).toEqual({});
  });
});
