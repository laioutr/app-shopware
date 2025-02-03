import { defineComponentResolver } from '#imports';
import { ProductBase, ProductMedia, ProductPrices } from '@laioutr-core/canonical-types/orchestr/product';
import { shopwareClientFactory } from '../../../client/shopwareClientFactory';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

export default defineComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductPrices, ProductMedia],
  resolve: async ({ entityIds }) => {
    const shopwareClient = shopwareClientFactory();
    const swResponse = await shopwareClient.invoke('readProduct post /product', {
      body: {
        ids: entityIds,
      },
    });
    const shopwareProducts = swResponse.data.elements ?? [];

    return {
      componentData: matchAndMap(
        entityIds,
        shopwareProducts,
        (id, product) => product.id === id,
        (rawProduct) => ({
          base: {
            name: rawProduct.translated.name ?? rawProduct.name,
            sku: rawProduct.translated.productNumber ?? rawProduct.productNumber,
            slug: 'asdasda',
          },
          media: {
            cover: {
              type: 'image' as const,
              provider: 'url',
              src: rawProduct.cover?.media?.url ?? '',
            },
            images: [],
          },
          prices: {
            price: {
              amount: Math.round((rawProduct.calculatedCheapestPrice?.unitPrice ?? rawProduct.calculatedPrice.unitPrice) * 100),
              currency: 'EUR',
            },
            priceNet: {
              amount: Math.round((rawProduct.calculatedCheapestPrice?.unitPrice ?? rawProduct.calculatedPrice.unitPrice) * 100),
              currency: 'EUR',
            },
            isOnSale: false,
            isStartingFrom: false,
          },
        })
      ),
    };
  },
  cache: {
    strategy: 'ttl',
    ttl: '1 day',
  },
});
