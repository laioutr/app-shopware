import { SuggestedSearchBase } from '@laioutr-core/canonical-types/entity/suggested-search';
import { SuggestedSearchSearchQuery } from '@laioutr-core/canonical-types/suggested-search';
import { suggestionResultsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { mapSuggestResponse } from '../../shopware-helper/suggestMapper';

type SuggestResponse = Parameters<typeof mapSuggestResponse>[0];

export default defineShopwareQuery({
  implements: SuggestedSearchSearchQuery,
  provides: [SuggestedSearchBase],
  run: async ({ context, input, passthrough, $entity }) => {
    const query = input.query ?? '';
    const id = `search-suggest:${query}`;

    // Shopware refuses a suggest read without a term, so an empty box suggests nothing.
    let data: SuggestResponse;
    if (query.trim()) {
      const response = await context.storefrontClient.invoke('searchSuggest post /search-suggest', { body: { search: query } });
      // The typed client leaves out the extensions that carry completions, brands and categories.
      data = response.data as unknown as SuggestResponse;
    }

    passthrough.set(suggestionResultsFragmentToken, { id, ...mapSuggestResponse(data) });

    return { entity: $entity({ id, base: { query } }) };
  },
});
