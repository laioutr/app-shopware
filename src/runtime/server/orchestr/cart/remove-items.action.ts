import { useRuntimeConfig } from '#imports';
import { CartRemoveItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors } from '../../shopware-helper/cartErrors';
import { ensureContextTokenCookie } from '../../shopware-helper/ensureContextTokenCookie';

export default defineShopwareAction(CartRemoveItemsAction, async ({ event, context, input }) => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];
  const { storefrontClient } = context;

  if (input.length === 0) return;

  const cart = await storefrontClient.invoke('removeLineItem post /checkout/cart/line-item/delete', {
    // The store-api types the ids as a non-empty tuple; the length guard above satisfies it.
    body: { ids: input as [string, ...string[]] },
  });

  ensureContextTokenCookie(event, cart.data.token, config.endpoint.startsWith('https://'));
  handleCartMutationErrors(cart.data.errors);
});
