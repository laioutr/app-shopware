import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedShopwareVersion } from './getShopwareVersion';

const runtimeConfig = { '@laioutr/app-shopware': { accessToken: 'token' } };
const store = new Map<string, string>();

vi.mock('#imports', () => ({
  useRuntimeConfig: () => runtimeConfig,
  useUserlandCache: (namespace: string) => ({
    readOne: async (key: string) =>
      store.has(`${namespace}/${key}`) ? { absent: false, value: store.get(`${namespace}/${key}`) } : undefined,
    writeOne: (key: string, value: string) => store.set(`${namespace}/${key}`, value),
  }),
}));

let shop = 0;
beforeEach(() => {
  // The module keeps per-shop state between calls, so every test talks to a shop of its own.
  runtimeConfig['@laioutr/app-shopware'].accessToken = `shop-${++shop}`;
});
afterEach(() => vi.useRealTimers());

describe('getCachedShopwareVersion', () => {
  it('reads the version from the Store API schema and caches it', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { info: { version: '6.6.10.27' } } });

    await expect(getCachedShopwareVersion({ invoke } as never)).resolves.toEqual([6, 6, 10, 27]);
    await expect(getCachedShopwareVersion({ invoke } as never)).resolves.toEqual([6, 6, 10, 27]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('shares one read between concurrent first requests', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { info: { version: '6.5.6.1' } } });

    const versions = await Promise.all([getCachedShopwareVersion({ invoke } as never), getCachedShopwareVersion({ invoke } as never)]);

    expect(versions).toEqual([
      [6, 5, 6, 1],
      [6, 5, 6, 1],
    ]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('answers undefined when the schema is unavailable, and waits before reading it again', async () => {
    vi.useFakeTimers();
    const invoke = vi.fn().mockRejectedValue(new Error('404'));

    await expect(getCachedShopwareVersion({ invoke } as never)).resolves.toBeUndefined();
    await expect(getCachedShopwareVersion({ invoke } as never)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000);
    await getCachedShopwareVersion({ invoke } as never);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('treats a schema without a readable version as unavailable', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { info: { version: 'dev-trunk' } } });

    await expect(getCachedShopwareVersion({ invoke } as never)).resolves.toBeUndefined();
  });
});
