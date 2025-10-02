import { GetCurrentCartQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';

export default defineShopwareQuery(GetCurrentCartQuery, async ({ context }) => {
  const { storefrontClient } = context;

  const cart = await storefrontClient.invoke('readCart get /checkout/cart');

  /* Cart is identified per unique context session */
  return { id: cart.data.token ?? '' };
});
