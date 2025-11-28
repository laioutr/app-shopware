import { CategoryBase, CategoryContent, CategoryMedia, CategorySeo } from '@laioutr-core/canonical-types/entity/category';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../shopware-helper/mediaMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  entityType: 'Category',
  label: 'Shopware Category Connector',
  provides: [CategoryBase, CategoryContent, CategoryMedia, CategorySeo],
  resolve: async ({ entityIds, context, passthrough, $entity }) => {
    const { storefrontClient } = context;

    const categories =
      passthrough.has(categoriesToken) ?
        passthrough.get(categoriesToken)!
      : (await storefrontClient.invoke('readCategoryList post /category')).data.elements;

    if (!categories) {
      throw new Error(
        'Categories not found in passthrough. The component resolver does not request categories from shopware at the moment.'
      );
    }

    return {
      entities: categories
        .filter((category) => entityIds.includes(category.id))
        .map((category) =>
          $entity({
            id: category.id,

            base: () => ({
              slug: entitySlug(category),
              title: swTranslated(category, 'name') ?? category.name,
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
  },
});
