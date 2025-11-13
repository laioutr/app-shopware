import { GetCurrentCartQuery } from '@laioutr-core/canonical-types/ecommerce';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';

export default defineShopwareQuery(GetCurrentCartQuery, async ({ context, passthrough }) => {
  const { storefrontClient } = context;

  const cart = await storefrontClient.invoke('readCart get /checkout/cart');

  passthrough.set(cartFragmentToken, cart.data);

  /* Cart is identified per unique context session */
  return { id: cart.data.token ?? '' };
});
