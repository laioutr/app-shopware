import type { components } from '../../../types/storeApiTypes';

export default defineReferenceResolver({
  label: 'Product Variants',
  referenceName: 'variants',
  sourceEntityType: 'Product',
  targetEntityType: 'ProductVariant',
  resolve: async ({ entityIds, entityData, context }) => {
    const shopwareProducts = (entityData?.shopware ?? []) as components['schemas']['Product'][];

    return {
      references: Object.fromEntries(
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
