import { describe, expect, it } from 'vitest';
import { entitySlug, getEntitySeoSlug, isSlugMatchingSeoPath } from './slugMapper';
import type { ShopwareCategory, ShopwareProduct } from '../../types/shopware';

const category = (seoPathInfo?: string): ShopwareCategory =>
  ({
    id: 'cat-1',
    name: 'Presents',
    seoUrls: seoPathInfo ? [{ seoPathInfo, isCanonical: true }] : [],
  }) as unknown as ShopwareCategory;

const product = (seoPathInfo: string): ShopwareProduct =>
  ({
    id: 'prod-1',
    name: 'Flower Towel',
    seoUrls: [{ seoPathInfo, isCanonical: true }],
  }) as unknown as ShopwareProduct;

describe('getEntitySeoSlug', () => {
  it('strips the trailing slash Shopware appends to category paths', () => {
    expect(getEntitySeoSlug(category('Gutscheine-Co./Kindergeburtstag-buchen/'))).toBe('Gutscheine-Co./Kindergeburtstag-buchen');
  });

  it('leaves a single-segment path with a trailing slash usable', () => {
    expect(getEntitySeoSlug(category('Praesente/'))).toBe('Praesente');
  });

  it('leaves .html paths untouched', () => {
    expect(getEntitySeoSlug(category('karls-manufakturen.html'))).toBe('karls-manufakturen.html');
  });

  it('leaves interior slashes untouched', () => {
    expect(getEntitySeoSlug(category('kosmetik/wellness.html'))).toBe('kosmetik/wellness.html');
  });
});

describe('isSlugMatchingSeoPath', () => {
  it('matches a route slug against a path that has a trailing slash', () => {
    expect(isSlugMatchingSeoPath('Gutscheine-Co./Kindergeburtstag-buchen', 'Gutscheine-Co./Kindergeburtstag-buchen/')).toBe(true);
  });

  it('matches regardless of case on either side', () => {
    expect(isSlugMatchingSeoPath('praesente', 'Praesente/')).toBe(true);
  });

  it('does not match a deeper path that merely shares a prefix', () => {
    expect(isSlugMatchingSeoPath('Praesente', 'Praesente/Probierboxen/')).toBe(false);
  });

  it('still matches product paths, which carry no trailing slash', () => {
    expect(isSlugMatchingSeoPath('Bonbons-Erdbeer-Mango/742120', 'Bonbons-Erdbeer-Mango/742120')).toBe(true);
  });
});

describe('entitySlug', () => {
  it('uses the normalised canonical seo path', () => {
    expect(entitySlug(category('Praesente/'))).toBe('Praesente');
  });

  it('leaves product seo paths unchanged', () => {
    expect(entitySlug(product('Bonbons-Erdbeer-Mango/742120'))).toBe('Bonbons-Erdbeer-Mango/742120');
  });

  it('falls back to a sluggified name when the category has no seo url', () => {
    expect(entitySlug(category())).toBe('presents-cat-1');
  });
});
