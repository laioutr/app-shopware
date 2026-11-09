import { ShopwareCartClearAction } from '../../../shared/tokens/cart';
import { defineShopwareAction } from '../../middleware/defineShopware';

/**
 * Empty the cart through `DELETE /checkout/cart`. A visitor without a context token has no cart, so
 * nothing is sent: a call would only mint a guest context to delete an empty cart from.
 */
export default defineShopwareAction(ShopwareCartClearAction, async ({ context }) => {
  if (!context.contextToken) return;
  await context.storefrontClient.invoke('deleteCart delete /checkout/cart');
});
