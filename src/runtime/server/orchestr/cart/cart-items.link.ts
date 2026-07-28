import { CartItemsLink } from '@laioutr-core/canonical-types/ecommerce';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareLink(CartItemsLink, async ({ context, passthrough }) => {
  const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
  passthrough.set(cartFragmentToken, cart);

  const targetIds = (cart.lineItems ?? []).filter((li) => li.type === 'product').map((li) => li.id);

  return { links: [{ sourceId: cart.token ?? '', targetIds }] };
});
