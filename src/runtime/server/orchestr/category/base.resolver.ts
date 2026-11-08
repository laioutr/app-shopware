import { CategoryBase, CategoryContent, CategoryMedia, CategorySeo } from '@laioutr-core/canonical-types/entity/category';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { toRequestCriteria } from '../../shopware-helper/criteria';
import { pickCustomFields } from '../../shopware-helper/customFields';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  entityType: 'Category',
  label: 'Shopware Category Connector',
  provides: [CategoryBase, CategoryContent, CategoryMedia, CategorySeo],
  resolve: async ({ entityIds, context, passthrough, $entity }) => {
    const { storefrontClient } = context;

    const readCategories = async () => {
      // Neither association is returned by default; without `media` the media component is always empty.
      const criteria = await context.resolveCriteria('category', { includes: {}, associations: { seoUrls: {}, media: {} } });

      const response = await storefrontClient.invoke('readCategoryList post /category', {
        body: { ids: entityIds, ...toRequestCriteria(criteria) },
      });

      return response.data.elements;
    };

    const fromPassthrough = passthrough.has(categoriesToken);
    const categories = fromPassthrough ? passthrough.get(categoriesToken)! : await readCategories();

    if (!categories) {
      throw new Error(
        'Categories not found in passthrough. The component resolver does not request categories from shopware at the moment.'
      );
    }

    // Only a read from Shopware tells what does not exist; a query hands over just the categories it loaded.
    const returnedIds = new Set(categories.map((category) => category.id));
    const notFound = fromPassthrough ? [] : entityIds.filter((entityId) => !returnedIds.has(entityId));

    return {
      notFound,
      entities: categories
        .filter((category) => entityIds.includes(category.id))
        .map((category) =>
          $entity({
            id: category.id,

            base: () => ({
              slug: entitySlug(category),
              title: swTranslated(category, 'name') ?? category.name,
              customFields: pickCustomFields(category, context.customFields, 'category'),
            }),

            content: () => ({
              description: { html: swTranslated(category, 'description') ?? category.description ?? '' },
            }),

            media: () => ({
              media: category.media ? [mapMedia(category.media)] : [],
            }),

            seo: () => ({
              title: category.metaTitle,
              description: category.metaDescription,
            }),
          })
        ),
    };
  },
  cache: {
    ttl: '10 minutes',
    swr: true,
    staleMaxAge: '10 minutes',
  },
});
