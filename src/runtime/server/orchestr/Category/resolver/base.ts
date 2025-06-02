import { CategoryBase } from '@laioutr-core/canonical-types/entity/category';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';

export default defineShopwareComponentResolver({
  label: 'Category Base',
  entityType: 'Category',
  provides: [CategoryBase],
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
