import { describe, expect, it } from 'vitest';
import { customFieldMatcher, pickCustomFields, withCustomFieldIncludes } from './customFields';
import type { ShopwareCriteria } from '../types/criteria';

describe('customFieldMatcher', () => {
  it('matches exact keys and globs', () => {
    const matches = customFieldMatcher(['energyLabel', 'gpsr_*', '*_teaser']);

    expect(matches('energyLabel')).toBe(true);
    expect(matches('energyLabelClass')).toBe(false);
    expect(matches('gpsr_address')).toBe(true);
    expect(matches('gpsr_')).toBe(true);
    expect(matches('category_teaser')).toBe(true);
    expect(matches('teaser_category')).toBe(false);
  });

  it('treats regex metacharacters in a key literally', () => {
    const matches = customFieldMatcher(['price.net', 'a+b*']);

    expect(matches('price.net')).toBe(true);
    expect(matches('priceXnet')).toBe(false);
    expect(matches('a+b_c')).toBe(true);
    expect(matches('aab_c')).toBe(false);
  });

  it('takes every key for a bare `*`', () => {
    expect(customFieldMatcher(['*'])('anything')).toBe(true);
  });

  it('compiles an include array once', () => {
    const include = ['gpsr_*'];

    expect(customFieldMatcher(include)).toBe(customFieldMatcher(include));
  });
});

describe('pickCustomFields', () => {
  const product = {
    customFields: { energyLabel: 'stale', internal: 'x' },
    translated: { customFields: { energyLabel: 'A', gpsr_address: 'Main St 1', internal: 'secret' } },
  };

  it('returns undefined while nothing is whitelisted for the entity', () => {
    expect(pickCustomFields(product, undefined, 'product')).toBeUndefined();
    expect(pickCustomFields(product, { variant: { include: ['*'] } }, 'product')).toBeUndefined();
    expect(pickCustomFields(product, { product: { include: [] } }, 'product')).toBeUndefined();
  });

  it('reads the translated values and keeps only whitelisted keys', () => {
    expect(pickCustomFields(product, { product: { include: ['energyLabel', 'gpsr_*'] } }, 'product')).toEqual({
      energyLabel: 'A',
      gpsr_address: 'Main St 1',
    });
  });

  it('falls back to the untranslated column', () => {
    expect(pickCustomFields({ customFields: { energyLabel: 'B' } }, { variant: { include: ['energyLabel'] } }, 'variant')).toEqual({
      energyLabel: 'B',
    });
  });

  it('returns an empty object for an entity without custom fields', () => {
    expect(pickCustomFields({ customFields: null }, { product: { include: ['*'] } }, 'product')).toEqual({});
  });

  it("reads a category's translated values under the category whitelist alone", () => {
    const category = { customFields: { teaser: 'stale' }, translated: { customFields: { teaser: 'Neu', erpId: '42' } } };

    expect(pickCustomFields(category, { category: { include: ['teaser'] } }, 'category')).toEqual({ teaser: 'Neu' });
    expect(pickCustomFields(category, { product: { include: ['*'] } }, 'category')).toBeUndefined();
  });

  it("reads a customer's column, which Shopware does not translate", () => {
    const customer = { customFields: { loyaltyTier: 'gold', creditLimit: 5000 }, translated: [] };

    expect(pickCustomFields(customer, { customer: { include: ['loyaltyTier'] } }, 'customer')).toEqual({ loyaltyTier: 'gold' });
    expect(pickCustomFields(customer, { product: { include: ['*'] } }, 'customer')).toBeUndefined();
  });
});

describe('withCustomFieldIncludes', () => {
  const criteria = (product: string[]): ShopwareCriteria => ({ includes: { product }, associations: {} });

  it('leaves the read alone when nothing is whitelisted', () => {
    const seed = criteria(['id']);
    expect(withCustomFieldIncludes('product', seed, undefined)).toBe(seed);
    expect(withCustomFieldIncludes('product', seed, { product: { include: [] } })).toBe(seed);
  });

  it('projects the column on a product read for either whitelist', () => {
    expect(withCustomFieldIncludes('product', criteria(['id']), { product: { include: ['a'] } }).includes.product).toEqual([
      'id',
      'customFields',
    ]);
    expect(withCustomFieldIncludes('product', criteria(['id']), { variant: { include: ['a'] } }).includes.product).toEqual([
      'id',
      'customFields',
    ]);
  });

  it('projects the column on a variant read only for the variant whitelist', () => {
    expect(withCustomFieldIncludes('product-variant', criteria(['id']), { product: { include: ['a'] } }).includes.product).toEqual(['id']);
    expect(withCustomFieldIncludes('product-variant', criteria(['id']), { variant: { include: ['a'] } }).includes.product).toEqual([
      'id',
      'customFields',
    ]);
  });

  it('projects the column on a category read only for the category whitelist', () => {
    const categoryCriteria = (category: string[]): ShopwareCriteria => ({ includes: { category }, associations: {} });

    expect(withCustomFieldIncludes('category', categoryCriteria(['id']), { product: { include: ['*'] } }).includes.category).toEqual(['id']);
    expect(withCustomFieldIncludes('category', categoryCriteria(['id']), { category: { include: ['a'] } }).includes.category).toEqual([
      'id',
      'customFields',
    ]);
  });

  it('keeps the category and customer whitelists off product reads', () => {
    const all = { category: { include: ['*'] }, customer: { include: ['*'] } };
    expect(withCustomFieldIncludes('product', criteria(['id']), all).includes.product).toEqual(['id']);
    expect(withCustomFieldIncludes('product-variant', criteria(['id']), all).includes.product).toEqual(['id']);
  });

  it('never touches a read that projects nothing', () => {
    const seed: ShopwareCriteria = { includes: {}, associations: {} };
    expect(withCustomFieldIncludes('category', seed, { category: { include: ['*'] } })).toBe(seed);
  });

  it('never touches a read no whitelist maps', () => {
    const all = { product: { include: ['*'] }, variant: { include: ['*'] }, category: { include: ['*'] } };
    const seed = criteria(['id']);
    const navigation: ShopwareCriteria = { includes: { category: ['id'] }, associations: {} };

    expect(withCustomFieldIncludes('product-review', seed, all)).toBe(seed);
    expect(withCustomFieldIncludes('menu', navigation, all)).toBe(navigation);
  });

  it('does not project the column twice', () => {
    expect(
      withCustomFieldIncludes('product', criteria(['id', 'customFields']), { product: { include: ['a'] } }).includes.product
    ).toEqual(['id', 'customFields']);
  });
});
