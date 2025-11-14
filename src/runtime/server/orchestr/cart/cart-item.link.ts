import { CartItemsLink } from '@laioutr-core/canonical-types/ecommerce';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(CartItemsLink, async ({ passthrough }) => {
  const cart = passthrough.require(cartFragmentToken);

  const lienItems = (cart.lineItems ?? []).filter((item) => item.type === 'product').map((item) => item.id);
  const discounts = (cart.lineItems ?? []).filter((item) => item.type === 'discount').map((item) => item.id);

  return {
    links: [
      {
        sourceId: cart.token as string,
        targetIds: [...lienItems, ...discounts],
      },
    ],
  };
});
