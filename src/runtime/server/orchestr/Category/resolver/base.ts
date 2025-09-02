import { MenuItemBase } from '@laioutr-core/canonical-types/entity/menuItem';

import { defineShopwareComponentResolver } from '../../../middleware/defineShopware';

export default defineShopwareComponentResolver({
  label: 'Category Base',
  entityType: 'MenuItem',
  provides: [MenuItemBase],
  resolve: async ({ entityIds, context }) => {
    const swResponse = await context.storefrontClient.invoke('readCategoryList post /category', {
      body: {
        ids: entityIds,
      },
    });

    return {
      entities:
        swResponse.data.elements?.map((entity) => ({
          id: entity.id,
          base: () => ({
            name: entity.name,
            slug: entity.seoUrls?.find((url) => url.isCanonical)?.seoPathInfo ?? entity.seoUrls?.[0]?.seoPathInfo ?? entity.id,
          }),
        })) ?? [],
    };
  },
});
