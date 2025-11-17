import { MenuItemBase } from '@laioutr-core/canonical-types/entity/menuItem';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareComponentResolver({
  entityType: 'MenuItem',
  label: 'Shopware Menu Connector',
  provides: [MenuItemBase],
  resolve: async ({ passthrough, $entity }) => {
    const categories = passthrough.require(categoriesToken);

    return {
      entities: categories.map((category) =>
        $entity({
          id: category.id,
          base: () => {
            const baseItem = {
              type: 'link',
              name: swTranslated(category, 'name'),
              childIds: category.children?.map((child) => child.id),
              parentId: category.parentId,
            } as const;

            if (category.type === 'folder') {
              return {
                ...baseItem,
                type: 'folder',
              };
            }
            if (category.type === 'link') {
              return {
                ...baseItem,
                link: {
                  type: 'url',
                  href: category.internalLink ?? category.externalLink ?? '/',
                },
              };
            }
            if (category.type === 'page') {
              return {
                ...baseItem,
                link: {
                  type: 'reference',
                  reference: {
                    type: category.linkType ?? 'category',
                    slug: entitySlug(category),
                    id: category.id,
                  },
                },
              };
            }

            return {
              ...baseItem,
              type: 'folder',
            };
          },
        })
      ),
    };
  },
  cache: {
    ttl: '10 minutes',
  },
});
