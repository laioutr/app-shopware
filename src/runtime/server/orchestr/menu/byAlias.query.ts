import { MenuByAliasQuery } from '@laioutr-core/canonical-types/ecommerce';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { flattenCategories } from '../../shopware-helper/categoryFlattener';

export default defineShopwareQuery({
  implements: MenuByAliasQuery,
  run: async ({ input, context, passthrough }) => {
    const { alias } = input;

    const response = await context.storefrontClient.invoke('readNavigation post /navigation/{activeId}/{rootId}', {
      pathParams: {
        activeId: alias,
        rootId: alias,
      },
      body: {},
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
