import { ProductVariantBase } from '@laioutr-core/canonical-types/entity/product-variant';
import type { components } from '../../../types/storeApiTypes';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';

export default defineShopwareComponentResolver({
  entityType: 'ProductVariant',
  label: 'Shopware Product Variant Connector',
  provides: [ProductVariantBase],
  resolve: async () => {
    const shopwareProducts = [] as components['schemas']['Product'][];

    return {
      entities: shopwareProducts.map((product) => ({
        id: product.id,
        base: () => ({
          sku: product.productNumber,
          name: product.translated.name ?? product.name,
          ean: product.ean,
        }),
      })),
    };
  },
});
