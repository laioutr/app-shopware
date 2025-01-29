import { CategoryBase } from '@laioutr-core/canonical-types/orchestr/category';
import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

export default defineComponentResolver({
  label: 'Category Base',
  entityType: 'Category',
  provides: [CategoryBase],
  resolve: async ({ entityIds, context }) => {
    const shopwareClient = await shopwareClientFactory();
    const swResponse = await shopwareClient.invoke('readCategoryList post /category', {
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
          base: {
            name: entity.name,
            slug: entity.seoUrls?.find((url) => url.isCanonical)?.seoPathInfo ?? entity.seoUrls?.[0]?.seoPathInfo ?? entity.id,
          },
        })
      ),
    };
  },
});
