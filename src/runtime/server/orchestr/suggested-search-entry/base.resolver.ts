import { SuggestedSearchEntryBase } from '@laioutr-core/canonical-types/entity/suggested-search-entry';
import { suggestionResultsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';

export default defineShopwareComponentResolver({
  label: 'Shopware Suggested Search Entry Resolver',
  entityType: 'SuggestedSearchEntry',
  provides: [SuggestedSearchEntryBase],
  resolve: ({ passthrough, $entity }) => {
    const results = passthrough.require(suggestionResultsFragmentToken);

    const entities = results.suggestions.map(({ id, type, title, link }) =>
      $entity({
        id,

        base: () => ({
          type,
          title,
          link,
        }),
      })
    );

    return { entities };
  },
});
