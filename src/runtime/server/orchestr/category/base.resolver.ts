import { MenuItemBase } from '@laioutr-core/canonical-types/entity/menuItem';

import { defineShopwareComponentResolver } from '../../middleware/defineShopware';

export default defineShopwareComponentResolver({
  label: 'Category base resolver',
  entityType: 'MenuItem',
  provides: [MenuItemBase],
  resolve: async ({ entityIds, context }) => {
    const response = await context.storefrontClient.invoke('readCategoryList post /category', {
      body: {
        ids: entityIds,
      },
    });

    return {
      entities: (response.data.elements ?? []).map((entity) => ({
        id: entity.id,
        base: () => ({
          type: 'url',
          href: `/${entity.seoUrls?.find((url) => url.isCanonical)?.seoPathInfo ?? entity.seoUrls?.[0]?.seoPathInfo ?? ''}`, // Absolute URL
          name: entity.name,
          parentId: entity.parentId,
          childIds: (entity.children ?? []).map((child) => child.id),
        }),
      })),
    };
  },
});
