import { CartAddItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors } from '../../shopware-helper/cartErrors';
import { ensureContextTokenCookie } from '../../shopware-helper/ensureContextTokenCookie';

export default defineShopwareAction(CartAddItemsAction, async ({ event, context, input }) => {
  const { storefrontClient } = context;

  const products = input.filter((i) => i.type === 'product');
  if (products.length === 0) return;

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

  ensureContextTokenCookie(event, cart.data.token);
  handleCartMutationErrors(cart.data.errors);
});
