import { beforeEach, describe, expect, it, vi } from 'vitest';
import groupProducts from './products.link';

const warn = vi.hoisted(() => vi.fn());
vi.mock('consola', () => ({ consola: { withTag: () => ({ warn }) } }));
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ parentIdToDefaultVariantIdToken: 'defaultVariants', crossSellingGroupsToken: 'groups' }));
vi.mock('../../composable/useGetProductParentId', () => ({ cacheProductParentIds: vi.fn() }));

type Run = (args: Record<string, unknown>) => Promise<{ links: Array<Record<string, unknown>> }>;
const run = (groupProducts as unknown as { run: Run }).run;

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const page = (limit = 24, offset = 0) => ({ limit, offset, page: Math.floor(offset / limit) + 1 });

const rows = {
  'g-similar': { productIds: ['p-1', 'v-1b'], products: [{ id: 'v-7', parentId: 'p-7' }, { id: 'v-1c', parentId: 'p-1' }, { id: 'p-8' }] },
};

beforeEach(() => warn.mockClear());

describe('ShopwareCrossSellingProductsLink', () => {
  it("links a group's products in its own order, without the product the group belongs to", async () => {
    const passthrough = passthroughOf({ groups: rows });

    const result = await run({ entityIds: ['g-similar'], passthrough, pagination: page() });

    expect(result.links).toEqual([{ sourceId: 'g-similar', targetIds: ['p-7', 'p-8'], entityTotal: 2 }]);
    expect(passthrough.get('defaultVariants')).toEqual({ 'p-7': 'v-7', 'p-8': 'p-8' });
  });

  it('pages the products', async () => {
    const result = await run({ entityIds: ['g-similar'], passthrough: passthroughOf({ groups: rows }), pagination: page(1, 1) });

    expect(result.links).toEqual([{ sourceId: 'g-similar', targetIds: ['p-8'], entityTotal: 2 }]);
  });

  it('links nothing, with a warning, for a group the request has not read', async () => {
    const result = await run({ entityIds: ['g-unknown'], passthrough: passthroughOf({ groups: rows }), pagination: page() });

    expect(result.links).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('g-unknown');
  });
});
