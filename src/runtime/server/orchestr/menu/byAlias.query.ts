import { MenuByAliasQuery } from '@laioutr-core/canonical-types/ecommerce';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { flattenCategories } from '../../shopware-helper/categoryFlattener';
import { toRequestCriteria } from '../../shopware-helper/criteria';

export default defineShopwareQuery({
  implements: MenuByAliasQuery,
  run: async ({ input, context, passthrough }) => {
    const { alias } = input;

    // Seo urls reach this response through the client's `sw-include-seo-urls` header: some instances
    // accept no association on the navigation route beyond the ones it loads itself.
    const criteria = await context.resolveCriteria('menu', { includes: {}, associations: {} });

    const response = await context.storefrontClient.invoke('readNavigation post /navigation/{activeId}/{rootId}', {
      pathParams: {
        activeId: alias,
        rootId: alias,
      },
      body: {
        ...toRequestCriteria(criteria),
        ...(context.settings.catalog.menuDepth === undefined ? {} : { depth: context.settings.catalog.menuDepth }),
      },
    });

    // response.data may be undefined
    const flattenedCategories = flattenCategories(response.data ?? []);
    passthrough.set(categoriesToken, flattenedCategories);

    return {
      ids: flattenedCategories.map((item) => item.id),
    };
  },
  cache: {
    strategy: 'ttl',
    ttl: '10 minutes',
    buildCacheKey({ input }) {
      return input.alias;
    },
  },
});
