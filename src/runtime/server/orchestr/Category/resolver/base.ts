import { CategoryBase } from '@laioutr-core/canonical-types/orchestr/category';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

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
      componentData: matchAndMap(
        entityIds,
        swResponse.data.elements,
        (id, child) => child.id === id,
        (entity) => ({
          base: () => ({
            name: entity.name,
            slug: entity.seoUrls?.find((url) => url.isCanonical)?.seoPathInfo ?? entity.seoUrls?.[0]?.seoPathInfo ?? entity.id,
          }),
        })
      ),
    };
  },
});
