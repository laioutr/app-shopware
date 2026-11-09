import { describe, expect, it, vi } from 'vitest';
import suggestedSearch from './suggested-search.query';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareQuery: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ suggestionResultsFragmentToken: 'suggestions' }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (suggestedSearch as unknown as { run: Run }).run;

const passthroughOf = () => {
  const store = new Map<string, unknown>();
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const $entity = (entity: unknown) => entity;

describe('SuggestedSearchSearchQuery', () => {
  it('answers the suggestion with its query, and leaves the entries and product rows for its links', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { elements: [{ id: 'v-1', parentId: 'p-1', name: 'Chair' }] } });
    const passthrough = passthroughOf();

    const result = await run({ context: { storefrontClient: { invoke } }, input: { query: 'chair' }, passthrough, $entity });

    expect(result).toEqual({ entity: { id: 'search-suggest:chair', base: { query: 'chair' } } });
    expect(invoke).toHaveBeenCalledWith('searchSuggest post /search-suggest', { body: { search: 'chair' } });
    expect(passthrough.get('suggestions')).toEqual({
      id: 'search-suggest:chair',
      suggestions: [expect.objectContaining({ id: 'v-1', type: 'product', title: 'Chair' })],
      products: [{ id: 'v-1', parentId: 'p-1' }],
    });
  });

  it.each([undefined, '', '  '])('suggests nothing for the term %j without asking Shopware', async (query) => {
    const invoke = vi.fn();
    const passthrough = passthroughOf();

    await run({ context: { storefrontClient: { invoke } }, input: { query }, passthrough, $entity });

    expect(invoke).not.toHaveBeenCalled();
    expect(passthrough.get('suggestions')).toEqual(expect.objectContaining({ suggestions: [], products: [] }));
  });
});
