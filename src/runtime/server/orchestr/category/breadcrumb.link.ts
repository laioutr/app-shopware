import { CategoryBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { readShopwareBreadcrumb, toBreadcrumbItems } from '../../shopware-helper/breadcrumb';

/**
 * The category's path from below the navigation root down to the category itself, as Shopware's own
 * breadcrumb gives it, with each level's SEO URL. A category whose breadcrumb cannot be read has an
 * empty one rather than failing the page.
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
    // One read per category: the route takes a single id.
    const breadcrumbs = await Promise.all(entityIds.map((id) => readShopwareBreadcrumb(context.storefrontClient, id, 'category')));

    return {
      links: entityIds.map((sourceId, index) => ({
        sourceId,
        entities: toBreadcrumbItems(breadcrumbs[index] ?? []).map(({ id, ...base }) => $entity({ id, base: () => base })),
      })),
    };
  },
});
