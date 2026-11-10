import { CategoryBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { readCategoryTrails, readShopwareBreadcrumbs, toBreadcrumbItems } from '../../shopware-helper/breadcrumb';

/**
 * The category's path from below the sales channel's root down to the category itself, the current
 * page. Shopware's own breadcrumb where the shop serves it, else one built from the category path.
 */
export default defineShopwareLink({
  implements: CategoryBreadcrumbLink,
  provides: [BreadcrumbItemBase],
  cache: {
    ttl: '1 hour',
    swr: true,
    staleMaxAge: '1 hour',
  },
  run: async ({ context, entityIds, $entity }) => {
    if (entityIds.length === 0) return { links: [] };

    const { storefrontClient, shopwareVersion, categoryRoots } = context;
    const fromRoute = await readShopwareBreadcrumbs(storefrontClient, shopwareVersion, entityIds, 'category');
    const fromPath = await readCategoryTrails(
      storefrontClient,
      categoryRoots,
      entityIds.filter((_, index) => !fromRoute[index])
    );

    return {
      links: entityIds.flatMap((sourceId, index) => {
        const route = fromRoute[index];
        const trail = route ? toBreadcrumbItems(route) : fromPath.get(sourceId);
        if (!trail) return [];

        return [
          {
            sourceId,
            entities: trail.map(({ id, ...base }) =>
              $entity({ id, base: () => ({ ...base, isCurrentPage: id === `breadcrumb:${sourceId}` }) })
            ),
          },
        ];
      }),
    };
  },
});
