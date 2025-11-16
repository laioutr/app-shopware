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
      url: '#', // TODO: Use proper URL (e.g. `/search/{val}`)
    }));

  const brandResults = Object.values(res.extensions?.multiSuggestResult?.suggestResults?.product_manufacturer?.elements ?? []).map(
    (manufacturer) => ({
      id: manufacturer.id,
      type: 'brand',
      title: manufacturer.name,
      url: '#', // TODO: Use proper URL (e.g. `/brands/{manufacturer.id}`)
    })
  );

  const categoryResults = Object.values(res.extensions?.multiSuggestResult?.suggestResults?.category?.elements ?? []).map((category) => ({
    id: category.id,
    type: 'category',
    title: category.name,
    url: '#', // TODO: Use proper URL (e.g. `/categories/{category.id}`)
  }));

  const productResults = (data.elements ?? []).map((product) => ({
    id: product.id,
    type: 'product',
    title: product.name,
    url: '#', // TODO: Use proper URL (e.g. `/products/{product.id}`)
  }));

  passthrough.set(suggestionResultsFragmentToken, [...querySuggestionsResults, ...brandResults, ...categoryResults, ...productResults]);

  return { id: '#' };
});
