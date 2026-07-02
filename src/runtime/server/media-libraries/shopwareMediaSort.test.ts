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

import { shopwareFolderFilter, shopwareSortCriteria } from './shopware';

describe('shopwareFolderFilter', () => {
  it('scopes root browsing to unfiled assets (mediaFolderId = null)', () => {
    expect(shopwareFolderFilter(undefined)).toEqual({ type: 'equals', field: 'mediaFolderId', value: null });
  });

  it('scopes a folder browse to that folder', () => {
    expect(shopwareFolderFilter('f-1')).toEqual({ type: 'equals', field: 'mediaFolderId', value: 'f-1' });
  });
});

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
