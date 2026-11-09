import { describe, expect, it, vi } from 'vitest';
import suggestedProducts from './suggested-search-products.link';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (_token: unknown, run: unknown) => run }));
vi.mock('../../const/passthroughTokens', () => ({
  parentIdToDefaultVariantIdToken: 'defaultVariants',
  suggestionResultsFragmentToken: 'suggestions',
}));
vi.mock('../../composable/useGetProductParentId', () => ({ cacheProductParentIds: vi.fn() }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return {
    get: (key: string) => store.get(key),
    require: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  };
};

describe('SuggestedSearchProductsLink', () => {
  it('links the suggested products as products, each showing the variant Shopware suggested', async () => {
    const passthrough = passthroughOf({
      suggestions: {
        id: 'search-suggest:chair',
        suggestions: [],
        products: [{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }, { id: 'v-1b', parentId: 'p-1' }],
      },
    });

    const result = await (suggestedProducts as unknown as Run)({ passthrough });

    expect(result).toEqual({ links: [{ sourceId: 'search-suggest:chair', targetIds: ['p-1', 'p-2'] }] });
    expect(passthrough.get('defaultVariants')).toEqual({ 'p-1': 'v-1', 'p-2': 'p-2' });
  });
});
