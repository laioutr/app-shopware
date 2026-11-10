import { describe, expect, it, vi } from 'vitest';
import search from './search.query';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareQuery: (_token: unknown, run: unknown) => run }));
vi.mock('../../const/passthroughTokens', () => ({ parentIdToDefaultVariantIdToken: 'defaultVariants' }));
vi.mock('../../composable/useGetProductParentId', () => ({ cacheProductParentIds: vi.fn() }));
vi.mock('../../shopware-helper/facetMapper', () => ({
  mapSelectedFiltersToShopwareFilters: () => ({}),
  mapShopwareAggregationToAvailableFilters: () => [],
}));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const passthroughOf = () => {
  const store = new Map<string, unknown>();
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const contextOf = (invoke: ReturnType<typeof vi.fn>, totalCountMode = 'next-pages') => ({
  storefrontClient: { invoke },
  shopwareVersion: [6, 6, 4, 0],
  currency: 'EUR',
  settings: { maxLimit: 100, totalCountMode },
});

const searchAnswer = {
  data: {
    elements: [{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }],
    total: 2,
    limit: 24,
    aggregations: {},
    availableSortings: [],
  },
};

describe('ProductSearchQuery', () => {
  it("passes the shop's total-count mode, as a category listing does", async () => {
    const invoke = vi.fn().mockResolvedValue(searchAnswer);

    const result = await (search as unknown as Run)({
      context: contextOf(invoke),
      input: { query: 'chair' },
      pagination: { page: 2, limit: 24, offset: 24 },
      passthrough: passthroughOf(),
    });

    expect(invoke).toHaveBeenCalledWith(
      'searchPage post /search',
      expect.objectContaining({ body: expect.objectContaining({ search: 'chair', 'total-count-mode': 'next-pages', page: 2, p: 2 }) })
    );
    expect(result).toEqual(expect.objectContaining({ ids: ['p-1', 'p-2'], total: 2 }));
  });

  it.each(['', '   '])('answers an empty result for the term %j without asking Shopware', async (query) => {
    const invoke = vi.fn();

    const result = await (search as unknown as Run)({
      context: contextOf(invoke),
      input: { query },
      pagination: { page: 1, limit: 24, offset: 0 },
      passthrough: passthroughOf(),
    });

    expect(result).toEqual({ ids: [], total: 0 });
    expect(invoke).not.toHaveBeenCalled();
  });
});
