import { describe, expect, it } from 'vitest';
import { defaultShopwareSettings } from './shopwareSettings';

describe('defaultShopwareSettings', () => {
  it('matches what the app hardcoded before the settings hook existed', () => {
    expect(defaultShopwareSettings()).toEqual({
      maxLimit: 100,
      totalCountMode: 'exact',
      loadVariantsOnListing: true,
      queryTemplateLimit: 50,
      mediaFolderLimit: 500,
      catalog: {
        menuDepth: undefined,
        categoryPageIndex: { types: ['page'], minLevel: 1, activeOnly: true },
        seoRouteNames: {
          product: ['frontend.detail.page'],
          category: ['frontend.navigation.page', 'frontend.landing.page'],
        },
      },
    });
  });

  it('hands out a fresh object, so one request’s handler cannot leak into the next', () => {
    const first = defaultShopwareSettings();
    first.maxLimit = 25;
    first.catalog.categoryPageIndex.types.push('landing_page');

    const second = defaultShopwareSettings();

    expect(second.maxLimit).toBe(100);
    expect(second.catalog.categoryPageIndex.types).toEqual(['page']);
  });
});
