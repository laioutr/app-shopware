import { MenuItemBase } from '@laioutr-core/canonical-types/entity/menuItem';
import { categoriesToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

const mapMenuItemReferenceType = (type: string): string => {
  if (type === 'page') {
    return 'page';
  }
  return type;
};

export default defineShopwareComponentResolver({
  entityType: 'MenuItem',
  label: 'Shopware Menu Connector',
  provides: [MenuItemBase],
  resolve: async ({ entityIds, context, passthrough, $entity }) => {
    const categories = passthrough.get(categoriesToken);

    if (!categories) {
      throw new Error(
        'Categories not found in passthrough. The component resolver does not request categories from shopware at the moment.'
      );
    }

    return {
      entities: categories.map((category) =>
        $entity({
          id: category.id,
          base: () => {
            const baseItem = {
              name: swTranslated(category, 'name'),
              childIds: category.children?.map((child) => child.id),
              parentId: category.parentId,
            };

            if (category.type === 'folder') {
              return {
                ...baseItem,
                type: 'folder',
              };
            }
            if (category.type === 'link') {
              return {
                ...baseItem,
                type: 'url',
                href: category.internalLink ?? category.externalLink ?? '/',
              };
            }
            if (category.type === 'page') {
              return {
                ...baseItem,
                type: 'reference',
                reference: {
                  type: category.linkType ?? 'category',
                  slug: entitySlug(category),
                  id: category.id,
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
