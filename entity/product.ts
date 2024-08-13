import type { CanonicalProductBase } from '@laioutr/frontend/domain/orchestr/canonical-types/product/base';
import { defineEntityResolver } from '@laioutr/frontend/kit';
import { shopwareClientFactory } from '../data-access/shopware-client-factory';
import { FALLBACK_CURRENCY_CODE, FALLBACK_IMAGE_URL } from '../const/fallbacks';
import { CanonicalProductPrices } from '@laioutr/frontend/domain/orchestr/canonical-types/product/prices';
import { Money } from '@screeny05/ts-money';

export default defineEntityResolver({
  pluginName: '@laioutr/shopware',
  entity: 'ltr:product',
  providedComponents: ['base', 'prices'],
  resolver: async (ids: string[], requestedComponents: string[]) => {
    const shopwareClient = shopwareClientFactory();

    // TODO cache this
    const context = await shopwareClient.invoke('readContext get /context');
    const currencyCode = context.data.currency?.isoCode ?? context.data.salesChannel.currency?.isoCode ?? FALLBACK_CURRENCY_CODE;

    const products = await shopwareClient.invoke('readProduct post /product', {
      body: {
        ids: ids,
      },
    });

    return (
      products.data.elements?.map((product) => ({
        id: product.id,
        base: {
          name: product.translated.name ?? product.name,
          image: {
            provider: 'ipx',
            type: 'image',
            value: product.cover?.media.url ?? FALLBACK_IMAGE_URL,
          },
        } satisfies CanonicalProductBase,
        prices: {
          price: Money.fromDecimal(product.calculatedPrice.totalPrice, currencyCode),
          allPricesEqual: true,
        } satisfies CanonicalProductPrices,
      })) ?? []
    );
  },
});
