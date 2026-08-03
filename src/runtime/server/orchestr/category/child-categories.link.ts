import { ChildCategoriesLink } from '@laioutr-core/canonical-types/ecommerce';
import type { StorefrontClient } from '../../types/shopware';
import { defineShopwareLink } from '../../middleware/defineShopware';

/**
 * The direct child categories of a category, in the order the shop defines.
 *
 * Reads the navigation route with the source category as its own root. That route nests and sorts
 * each level server-side, and returns exactly the categories the shop shows in navigation, so this
 * handler neither sorts nor filters.
 *
 * Sorting client-side is not an option: Shopware orders siblings through an `afterCategoryId` chain
 * whose links include categories the shop hides. Reconstructing the order therefore needs the whole
 * unfiltered sibling set, and any filtered read — which is all the category search route offers —
 * severs the chain and yields a different order than the shop's.
 *
 * The route ignores `limit`, so the response covers one category's direct children in full;
 * `pagination` is applied here. Returns ids rather than inline entities, so the category component
 * resolver hydrates children with every component.
 */
const readChildren = async (storefrontClient: StorefrontClient, categoryId: string) => {
  const response = await storefrontClient.invoke('readNavigation post /navigation/{activeId}/{rootId}', {
    pathParams: { activeId: categoryId, rootId: categoryId },
    body: {
      depth: 1,
      // A projection, so unlike a filter it removes no rows and cannot disturb the server's order.
      includes: { category: ['id'] },
    },
  });

  return response.data ?? [];
};

export default defineShopwareLink({
  implements: ChildCategoriesLink,
  run: async ({ entityIds, context, pagination }) => {
    if (entityIds.length === 0) return { links: [] };

    // One read per source: the route takes a single root, so there is no batch form to use.
    const childrenPerSource = await Promise.all(entityIds.map((categoryId) => readChildren(context.storefrontClient, categoryId)));

    return {
      links: entityIds.map((sourceId, index) => {
        const children = childrenPerSource[index] ?? [];

        return {
          sourceId,
          targetIds: children.slice(pagination.offset, pagination.offset + pagination.limit).map((child) => child.id),
          entityTotal: children.length,
        };
      }),
    };
  },
  cache: {
    strategy: 'ttl',
    ttl: '10 minutes',
    // `linkRunner` already prefixes a client-env key, so locale, market and currency are covered.
    buildCacheKey: ({ entityIds, pagination }) => `${[...entityIds].sort().join(',')}:${pagination.offset}:${pagination.limit}`,
  },
});
