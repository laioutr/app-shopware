import { CartUpdateItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors } from '../../shopware-helper/cartErrors';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { Schemas } from '../../types/storeApiTypes';

export default defineShopwareAction(CartUpdateItemsAction, async ({ event, context, input }) => {
  const { storefrontClient } = context;

  // Only quantity updates are supported for products; entries without a quantity are skipped.
  // A quantity of 0 is passed through to Shopware, which validates it; removal is a separate
  // action (CartRemoveItemsAction), so we don't reinterpret 0 as a delete here.
  const items = input.filter((item) => item.quantity !== undefined).map((item) => ({ id: item.itemId, quantity: item.quantity }));

  if (items.length === 0) return;

  const cart = await storefrontClient.invoke('updateLineItem patch /checkout/cart/line-item', {
    // Shopware only needs id + quantity to update a line item; the generated LineItem
    // type over-specifies required fields, so we send the minimal shape and cast.
    body: { items: items as unknown as Schemas['LineItem'][] },
  });

  await persistContextToken(event, cart.data.token);
  handleCartMutationErrors(cart.data.errors);
});
