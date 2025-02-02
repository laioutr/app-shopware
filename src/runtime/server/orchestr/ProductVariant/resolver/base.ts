import { defineComponentResolver } from '#imports';
import { ProductVariantBase } from '@laioutr-core/canonical-types/orchestr/product-variant';
import type { components } from '../../../types/storeApiTypes';

export default defineComponentResolver({
  entityType: 'ProductVariant',
  label: 'Shopware Product Variant Connector',
  provides: [ProductVariantBase],
  resolve: async ({ entityData }) => {
    const shopwareProducts = (entityData?.shopware ?? []) as components['schemas']['Product'][];

    return {
      componentData: Object.fromEntries(
        shopwareProducts.map((product) => [
          product.id,
          {
            base: {
              sku: product.productNumber,
              name: product.translated.name ?? product.name,
              ean: product.ean,
            },
          },
        ])
      ),
    };
  },
});
