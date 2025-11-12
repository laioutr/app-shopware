import { setCookie, useRuntimeConfig } from '#imports';
import { CartAddItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { CONTEXT_TOKEN_COOKIE } from '../../const/cookieKeys';
import { defineShopwareAction } from '../../middleware/defineShopware';

export default defineShopwareAction(CartAddItemsAction, async ({ event, context, input }) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];

  const { storefrontClient } = context;

  const products = input.filter((i) => i.type === 'product');

  if (products.length > 0) {
    const cart = await storefrontClient.invoke('addLineItem post /checkout/cart/line-item', {
      body: {
        items: products.map((product) => ({
          children: {},
          deliveryInformation: { apiAlias: 'cart_delivery_information' },
          id: product.variantId ?? product.productId,
          payload: {
            type: product.type,
            id: product.variantId ?? product.productId,
          },
          quantity: product.quantity,
          states: ['is-physical'],
          type: product.type,
        })),
      },
    });

    if (cart.data.token) {
      setCookie(event, CONTEXT_TOKEN_COOKIE, cart.data.token, {
        maxAge: 60 * 60 * 24 * 365, // days
        path: '/',
        sameSite: 'lax',
        secure: config.endpoint.startsWith('https://'),
      });
    }
  }
});
