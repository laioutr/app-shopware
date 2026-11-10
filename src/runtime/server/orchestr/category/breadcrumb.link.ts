import { CategoryBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import type { ShopwareCategory, StorefrontClient } from '../../types/shopware';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { categoryTrailIds } from '../../shopware-helper/categoryTrail';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

const readCategories = async (storefrontClient: StorefrontClient, ids: string[]): Promise<ShopwareCategory[]> => {
  if (ids.length === 0) return [];

  const response = await storefrontClient.invoke('readCategoryList post /category', {
    body: {
      ids,
      associations: { seoUrls: {} },
      includes: {
        category: ['id', 'name', 'translated', 'path', 'type', 'seoUrls'],
        seo_url: ['seoPathInfo', 'isCanonical'],
      },
    },
  });

  return response.data.elements ?? [];
};

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

    const { storefrontClient, categoryRoots } = context;
    const sources = await readCategories(storefrontClient, entityIds);

    const trails = new Map(sources.map((category) => [category.id, categoryTrailIds(category, categoryRoots)]));
    const categories = new Map(sources.map((category) => [category.id, category]));

    // A path holds only ids, so the ancestors' names and slugs take a second read, shared by the batch.
    const ancestorIds = [...new Set([...trails.values()].flat())].filter((id) => !categories.has(id));
    for (const ancestor of await readCategories(storefrontClient, ancestorIds)) categories.set(ancestor.id, ancestor);

    const toBreadcrumbItem = (category: ShopwareCategory, isCurrentPage: boolean) =>
      $entity({
        id: `breadcrumb:${category.id}`,
        base: () => ({
          name: swTranslated(category, 'name'),
          isCurrentPage,
          // A folder only structures the tree and has no page to link to.
          ...(category.type === 'folder' ?
            {}
          : {
              link: {
                type: 'reference' as const,
                reference: { type: 'Category', slug: entitySlug(category), id: category.id },
              },
            }),
        }),
      });

    return {
      links: entityIds.flatMap((sourceId) => {
        const trail = trails.get(sourceId);
        if (!trail) return [];

        return [
          {
            sourceId,
            entities: trail.flatMap((id) => {
              const category = categories.get(id);
              return category ? [toBreadcrumbItem(category, id === sourceId)] : [];
            }),
          },
        ];
      }),
    };
  },
});
