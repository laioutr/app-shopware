import { describe, expect, it, vi } from 'vitest';
import { mapSuggestResponse } from './suggestMapper';

vi.mock('@laioutr-core/canonical-types/ecommerce', () => ({ ProductSearchPage: 'ecommerce/product-search-page' }));

const media = {
  id: 'm-1',
  url: 'https://cdn.example.com/chair.jpg',
  mimeType: 'image/jpeg',
  thumbnails: [],
  metaData: { width: 800, height: 600 },
};

describe('mapSuggestResponse', () => {
  it('maps completions, brands, categories and products into entries, in that order', () => {
    const { suggestions } = mapSuggestResponse({
      extensions: {
        completionResult: { 0: 'chair', 1: 'chairs', apiAlias: 'array_struct' },
        multiSuggestResult: {
          suggestResults: {
            product_manufacturer: { elements: { 'b-1': { id: 'b-1', name: 'Acme' } as never } },
            category: { elements: { 'c-1': { id: 'c-1', name: 'Chairs', translated: { name: 'Stühle' }, seoUrls: [] } as never } },
          },
        },
      },
      elements: [],
    });

    expect(suggestions.map(({ type, title }) => [type, title])).toEqual([
      ['query-suggestion', 'chair'],
      ['query-suggestion', 'chairs'],
      ['brand', 'Acme'],
      ['category', 'Stühle'],
    ]);
    expect(suggestions[0]!.link).toEqual({ type: 'pageType', pageType: 'ecommerce/product-search-page', params: { q: 'chair' } });
  });

  it('titles a variant by its inherited name and shows its cover', () => {
    const { suggestions } = mapSuggestResponse({
      elements: [{ id: 'v-1', parentId: 'p-1', name: null, translated: { name: 'Lounge chair' }, cover: { media }, seoUrls: [] } as never],
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        id: 'v-1',
        type: 'product',
        title: 'Lounge chair',
        cover: expect.objectContaining({ type: 'image' }),
        link: expect.objectContaining({ type: 'reference', reference: expect.objectContaining({ type: 'product', id: 'v-1' }) }),
      }),
    ]);
  });

  it('hands over the product rows for the products link, a variant with its parent', () => {
    const { products } = mapSuggestResponse({
      elements: [{ id: 'v-1', parentId: 'p-1', name: 'A' } as never, { id: 'p-2', parentId: null, name: 'B' } as never],
    });

    expect(products).toEqual([{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }]);
  });

  it('suggests nothing for a missing answer', () => {
    expect(mapSuggestResponse(undefined)).toEqual({ suggestions: [], products: [] });
  });
});
