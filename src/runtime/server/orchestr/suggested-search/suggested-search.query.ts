import { ProductSearchPage } from '@laioutr-core/canonical-types/ecommerce';
import { SuggestedSearchSearchQuery } from '@laioutr-core/canonical-types/suggested-search';
import { suggestionResultsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { ShopwareExtensions } from '../../types/shopware';

export default defineShopwareQuery(SuggestedSearchSearchQuery, async ({ context, input, passthrough }) => {
  const { storefrontClient } = context;

  const { query } = input;

  const { data } = await storefrontClient.invoke('searchSuggest post /search-suggest', {
    body: { search: query ?? '' },
  });

  const res = data as unknown as ShopwareExtensions;

  const querySuggestionsResults = Object.values(res.extensions?.completionResult ?? {})
    .filter((val) => val !== 'array_struct')
    .map((val, index) => ({
      id: `query_suggestion_${index}`,
      type: 'query-suggestion',
      title: val,
      link: { type: 'pageType', pageType: ProductSearchPage, params: { q: val } } as const,
    }));

  const brandResults = Object.values(res.extensions?.multiSuggestResult?.suggestResults?.product_manufacturer?.elements ?? []).map(
    (manufacturer) => ({
      id: manufacturer.id,
      type: 'brand',
      title: manufacturer.name,
      link: {
        type: 'reference',
        reference: { type: 'brand', id: manufacturer.id, slug: manufacturer.id },
      } as const,
    })
  );

  const categoryResults = Object.values(res.extensions?.multiSuggestResult?.suggestResults?.category?.elements ?? []).map((category) => ({
    id: category.id,
    type: 'category',
    title: category.name,
    link: {
      type: 'reference',
      reference: { type: 'category', id: category.id, slug: category.seoUrls?.[0]?.pathInfo?.split('/').at(-1) ?? '' },
    } as const,
  }));

  const productResults = (data.elements ?? []).map((product) => ({
    id: product.id,
    type: 'product',
    title: product.name,
    link: {
      type: 'reference',
      reference: { type: 'product', id: product.id, slug: product.seoUrls?.[0]?.pathInfo?.split('/').at(-1) ?? '' },
    } as const,
  }));

  const id = `search-suggest:${query}`;

  passthrough.set(suggestionResultsFragmentToken, {
    id,
    suggestions: [...querySuggestionsResults, ...brandResults, ...categoryResults, ...productResults],
  });

  return { id };
});
