import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCrossSellings } from './readCrossSellings';

const warn = vi.hoisted(() => vi.fn());
vi.mock('consola', () => ({ consola: { withTag: () => ({ warn }) } }));

const runtimeConfig = { '@laioutr/app-shopware': { accessToken: 'token' } };
const store = new Map<string, unknown>();

vi.mock('#imports', () => ({
  useRuntimeConfig: () => runtimeConfig,
  useUserlandCache: (namespace: string) => ({
    readOne: async (key: string) =>
      store.has(`${namespace}/${key}`) ? { absent: false, value: store.get(`${namespace}/${key}`) } : undefined,
    writeOne: (key: string, value: unknown) => store.set(`${namespace}/${key}`, value),
  }),
}));

const answer = (groupId: string, productIds: string[]) => ({
  data: [
    {
      apiAlias: 'cross_selling_element',
      crossSelling: { id: groupId, name: groupId, position: 1, type: 'productList', active: true },
      products: productIds.map((id) => ({ id })),
      total: productIds.length,
    },
  ],
});

const clientOf = (invoke: ReturnType<typeof vi.fn>, headers: Record<string, string> = {}) =>
  ({ invoke, defaultHeaders: { 'sw-language-id': 'lang-en', 'sw-currency-id': 'cur-eur', ...headers } }) as never;

beforeEach(() => {
  store.clear();
  warn.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('readCrossSellings', () => {
  it("asks Shopware's cross-selling route per product, with includes that keep the answer small", async () => {
    const invoke = vi.fn().mockResolvedValue(answer('g-1', ['p-2']));

    const groups = await readCrossSellings(clientOf(invoke), ['p-1']);

    expect(groups.get('p-1')).toEqual([{ id: 'g-1', name: 'g-1', position: 1, type: 'productList', products: [{ id: 'p-2' }] }]);
    expect(invoke).toHaveBeenCalledWith('readProductCrossSellings post /product/{productId}/cross-selling', {
      pathParams: { productId: 'p-1' },
      body: { includes: expect.objectContaining({ product: ['id', 'parentId'] }) },
    });
  });

  it('caches per product, language and currency', async () => {
    const invoke = vi.fn().mockResolvedValue(answer('g-1', ['p-2']));

    await readCrossSellings(clientOf(invoke), ['p-1']);
    await readCrossSellings(clientOf(invoke), ['p-1']);
    expect(invoke).toHaveBeenCalledTimes(1);

    await readCrossSellings(clientOf(invoke, { 'sw-language-id': 'lang-de' }), ['p-1']);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('reads a product asked for twice, or by two links at once, once', async () => {
    const invoke = vi.fn().mockResolvedValue(answer('g-1', ['p-2']));

    await Promise.all([readCrossSellings(clientOf(invoke), ['p-1', 'p-1']), readCrossSellings(clientOf(invoke), ['p-1'])]);

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('leaves out a product whose read fails, warns, and does not cache the failure', async () => {
    const invoke = vi.fn(async (_operation: string, { pathParams }: { pathParams: { productId: string } }) => {
      if (pathParams.productId === 'p-broken') throw new Error('503');
      return answer(`g-${pathParams.productId}`, ['p-9']);
    });

    const groups = await readCrossSellings(clientOf(invoke), ['p-1', 'p-broken']);

    expect([...groups.keys()]).toEqual(['p-1']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('p-broken');

    await readCrossSellings(clientOf(invoke), ['p-broken']);
    expect(invoke.mock.calls.filter(([, { pathParams }]) => pathParams.productId === 'p-broken')).toHaveLength(2);
  });

  it('keeps at most four reads in flight for a page of products', async () => {
    let running = 0;
    let peak = 0;
    const invoke = vi.fn(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running--;
      return answer('g', ['p-9']);
    });

    const ids = Array.from({ length: 10 }, (_, index) => `p-${index}`);
    const groups = await readCrossSellings(clientOf(invoke), ids);

    expect(groups.size).toBe(10);
    expect(peak).toBe(4);
  });
});
