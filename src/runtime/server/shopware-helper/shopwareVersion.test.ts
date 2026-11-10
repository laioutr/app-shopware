import { describe, expect, it } from 'vitest';
import {
  formatShopwareVersion,
  hasBreadcrumbRoute,
  isAtLeast,
  listingPageParams,
  parseShopwareVersion,
  productSearchRoute,
  warnOnIgnoredLimit,
} from './shopwareVersion';

describe('parseShopwareVersion', () => {
  it('reads the four numeric parts', () => {
    expect(parseShopwareVersion('6.6.10.27')).toEqual([6, 6, 10, 27]);
    expect(parseShopwareVersion('v6.7.12.1')).toEqual([6, 7, 12, 1]);
    expect(parseShopwareVersion('6.7.0.0-RC1')).toEqual([6, 7, 0, 0]);
  });

  it('rejects anything else', () => {
    expect(parseShopwareVersion('6.7')).toBeUndefined();
    expect(parseShopwareVersion('')).toBeUndefined();
    expect(parseShopwareVersion(undefined)).toBeUndefined();
    expect(parseShopwareVersion(6.7)).toBeUndefined();
  });
});

describe('formatShopwareVersion', () => {
  it('joins the parts, or names an unknown version', () => {
    expect(formatShopwareVersion([6, 5, 6, 1])).toBe('6.5.6.1');
    expect(formatShopwareVersion(undefined)).toBe('unknown');
  });
});

describe('isAtLeast', () => {
  it('compares part by part, numerically', () => {
    expect(isAtLeast([6, 6, 10, 0], '6.6.10.0')).toBe(true);
    expect(isAtLeast([6, 6, 10, 27], '6.6.9.0')).toBe(true);
    expect(isAtLeast([6, 6, 9, 99], '6.6.10.0')).toBe(false);
    expect(isAtLeast([6, 7, 0, 0], '6.6.10.0')).toBe(true);
    expect(isAtLeast([6, 5, 6, 1], '6.7.0.0')).toBe(false);
  });

  it('answers false for an unknown version', () => {
    expect(isAtLeast(undefined, '6.0.0.0')).toBe(false);
  });
});

describe('hasBreadcrumbRoute', () => {
  it('answers true from 6.6.7, the release that added the route', () => {
    expect(hasBreadcrumbRoute([6, 6, 6, 1])).toBe(false);
    expect(hasBreadcrumbRoute([6, 5, 6, 1])).toBe(false);
    expect(hasBreadcrumbRoute([6, 6, 7, 0])).toBe(true);
    expect(hasBreadcrumbRoute([6, 7, 9, 1])).toBe(true);
  });

  it('answers true for an unknown version, which the app treats as current', () => {
    expect(hasBreadcrumbRoute(undefined)).toBe(true);
  });
});

describe('productSearchRoute', () => {
  it('reads /search-suggest from 6.6.10 up to, not including, 6.7.3', () => {
    expect(productSearchRoute([6, 6, 10, 0])).toBe('suggest');
    expect(productSearchRoute([6, 6, 10, 27])).toBe('suggest');
    expect(productSearchRoute([6, 7, 2, 9])).toBe('suggest');
  });

  it('reads /search everywhere else, and for an unknown version', () => {
    expect(productSearchRoute([6, 5, 6, 1])).toBe('search');
    expect(productSearchRoute([6, 6, 9, 0])).toBe('search');
    expect(productSearchRoute([6, 7, 3, 0])).toBe('search');
    expect(productSearchRoute([6, 7, 15, 1])).toBe('search');
    expect(productSearchRoute(undefined)).toBe('search');
  });
});

describe('listingPageParams', () => {
  it('sends only `page` from 6.7 on', () => {
    expect(listingPageParams([6, 7, 0, 0], 3)).toEqual({ page: 3 });
    expect(listingPageParams([6, 7, 15, 1], 3)).toEqual({ page: 3 });
  });

  it('sends `page` and `p` below 6.7, and for an unknown version', () => {
    expect(listingPageParams([6, 5, 6, 1], 3)).toEqual({ page: 3, p: 3 });
    expect(listingPageParams([6, 6, 10, 27], 3)).toEqual({ page: 3, p: 3 });
    expect(listingPageParams(undefined, 3)).toEqual({ page: 3, p: 3 });
  });
});

describe('warnOnIgnoredLimit', () => {
  it('reports a read paged by a different limit than requested', () => {
    expect(warnOnIgnoredLimit('search', [6, 6, 10, 27], { requested: 48, effective: 24, maxLimit: 100 })).toBe(true);
  });

  it('ignores a read that kept the limit, carried none, or asked for more than the shop allows', () => {
    expect(warnOnIgnoredLimit('search', [6, 7, 15, 1], { requested: 48, effective: 48, maxLimit: 100 })).toBe(false);
    expect(warnOnIgnoredLimit('search', [6, 7, 15, 1], { requested: 48, effective: undefined, maxLimit: 100 })).toBe(false);
    expect(warnOnIgnoredLimit('search', [6, 7, 15, 1], { requested: 200, effective: 100, maxLimit: 100 })).toBe(false);
  });
});
