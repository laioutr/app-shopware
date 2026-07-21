import { CartRemoveItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors } from '../../shopware-helper/cartErrors';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

export default defineShopwareAction(CartRemoveItemsAction, async ({ event, context, input }) => {
  const { storefrontClient } = context;

  if (input.length === 0) return;

  const cart = await storefrontClient.invoke('removeLineItem post /checkout/cart/line-item/delete', {
    // The store-api types the ids as a non-empty tuple; the length guard above satisfies it.
    body: { ids: input as [string, ...string[]] },
  });

  await persistContextToken(event, cart.data.token);
  handleCartMutationErrors(cart.data.errors);
});
