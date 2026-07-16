import { useRuntimeConfig } from '#imports';
import { CartUpdateItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors } from '../../shopware-helper/cartErrors';
import { ensureContextTokenCookie } from '../../shopware-helper/ensureContextTokenCookie';
import { Schemas } from '../../types/storeApiTypes';

export default defineShopwareAction(CartUpdateItemsAction, async ({ event, context, input }) => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];
  const { storefrontClient } = context;

  // Only quantity updates are supported for products; entries without a quantity are skipped.
  const items = input.filter((item) => item.quantity !== undefined).map((item) => ({ id: item.itemId, quantity: item.quantity }));

  if (items.length === 0) return;

  const cart = await storefrontClient.invoke('updateLineItem patch /checkout/cart/line-item', {
    // Shopware only needs id + quantity to update a line item; the generated LineItem
    // type over-specifies required fields, so we send the minimal shape and cast.
    body: { items: items as unknown as Schemas['LineItem'][] },
  });

  ensureContextTokenCookie(event, cart.data.token, config.endpoint.startsWith('https://'));
  handleCartMutationErrors(cart.data.errors);
});
