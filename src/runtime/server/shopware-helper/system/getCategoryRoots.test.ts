import { createAPIClient } from '@shopware/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedCategoryRoots } from './getCategoryRoots';

const runtimeConfig = { '@laioutr/app-shopware': { endpoint: 'https://shop.example/store-api', accessToken: 'token' } };
const store = new Map<string, unknown>();
const invoke = vi.fn();

vi.mock('#imports', () => ({
  useRuntimeConfig: () => runtimeConfig,
  useUserlandCache: (namespace: string) => ({
    readOne: async (key: string) =>
      store.has(`${namespace}/${key}`) ? { absent: false, value: store.get(`${namespace}/${key}`) } : undefined,
    writeOne: (key: string, value: unknown) => store.set(`${namespace}/${key}`, value),
  }),
}));
vi.mock('@shopware/api-client', () => ({ createAPIClient: vi.fn(() => ({ invoke })) }));

const salesChannel = { navigationCategoryId: 'main-root', serviceCategoryId: 'service-root', footerCategoryId: null };

beforeEach(() => {
  store.clear();
  invoke.mockReset();
  vi.mocked(createAPIClient).mockClear();
});

describe('getCachedCategoryRoots', () => {
  it("reads the sales channel's category roots once and serves them from the cache", async () => {
    invoke.mockResolvedValue({ data: { salesChannel } });

    await expect(getCachedCategoryRoots()).resolves.toEqual({ navigation: 'main-root', service: 'service-root' });
    await expect(getCachedCategoryRoots()).resolves.toEqual({ navigation: 'main-root', service: 'service-root' });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('readContext get /context');
  });

  it("reads them outside the visitor's session, so the visitor's client never adopts the token the read answers with", async () => {
    invoke.mockResolvedValue({ data: { salesChannel } });

    await getCachedCategoryRoots();

    expect(createAPIClient).toHaveBeenCalledWith({ baseURL: 'https://shop.example/store-api', accessToken: 'token' });
  });

  it('answers undefined when the read fails, and reads again on the next call', async () => {
    invoke.mockRejectedValueOnce(new Error('503')).mockResolvedValue({ data: { salesChannel } });

    await expect(getCachedCategoryRoots()).resolves.toBeUndefined();
    await expect(getCachedCategoryRoots()).resolves.toEqual({ navigation: 'main-root', service: 'service-root' });
  });
});
