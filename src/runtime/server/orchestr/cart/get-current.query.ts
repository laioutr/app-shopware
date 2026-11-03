import { GetCurrentCartQuery } from '@laioutr-core/canonical-types/ecommerce';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareQuery(GetCurrentCartQuery, async ({ context, passthrough, notFound }) => {
  const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
  passthrough.set(cartFragmentToken, cart);

  /* Cart is identified per unique context session */
  return cart.token ? { id: cart.token } : notFound();
});
