// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// defineShopware imports defineOrchestr from '#imports' (a Nuxt auto-import virtual module).
// In unit tests there is no Nuxt runtime to resolve that alias, so we stub out the three
// modules that form the Nuxt-runtime-dependent chain, leaving shopwareSortCriteria as a
// pure, testable export.
vi.mock('../middleware/defineShopware', () => ({
  defineShopware: { mediaLibrary: (provider: unknown) => provider },
}));
vi.mock('../client/shopwareAdminClientFactory', () => ({
  shopwareAdminClientFactory: vi.fn(),
}));
vi.mock('../shopware-helper/mediaMapper', () => ({
  mapMedia: vi.fn(),
}));

import { shopwareSortCriteria } from './shopware';

describe('shopwareSortCriteria', () => {
  it('defaults to uploadedAt descending', () => {
    expect(shopwareSortCriteria(undefined)).toEqual([{ field: 'uploadedAt', order: 'DESC' }]);
  });

  it('maps fileName ascending', () => {
    expect(shopwareSortCriteria('fileName:asc')).toEqual([{ field: 'fileName', order: 'ASC' }]);
  });

  it('maps fileSize descending', () => {
    expect(shopwareSortCriteria('fileSize:desc')).toEqual([{ field: 'fileSize', order: 'DESC' }]);
  });
});
