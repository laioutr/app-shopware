import { defineLinkResolver } from '#imports';
import type { components } from '../../../types/storeApiTypes';

export default defineLinkResolver({
  label: 'Product Variants',
  linkName: 'variants',
  sourceEntityType: 'Product',
  targetEntityType: 'ProductVariant',
  resolve: async ({ entityIds, entityData, context }) => {
    const shopwareProducts = (entityData?.shopware ?? []) as components['schemas']['Product'][];

    return {
      links: Object.fromEntries(
        shopwareProducts.map((product) => [
          product.id,
          {
            entityIds: product.children?.map((child) => child.id) ?? [product.id],
          },
        ])
      ),
      customData: {
        shopware: shopwareProducts,
      },
    };
  },
});
