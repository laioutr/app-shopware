import { useRuntimeConfig } from '#imports';
import { CartBase, CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { Link } from '@laioutr-core/core-types/common';
import { CHECKOUT_ENDPOINT_PATH } from '../../const/checkout';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { mapCartCost } from '../../shopware-helper/cartMapper';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareComponentResolver({
  entityType: 'Cart',
  label: 'Shopware Cart Component Resolver',
  provides: [CartBase, CartCost],
  resolve: async ({ context, $entity, passthrough }) => {
    /* Cart is identified per unique context session */
    const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
    passthrough.set(cartFragmentToken, cart);

    const config = useRuntimeConfig()['@laioutr-app/shopware'];
    const totalQuantity = (cart.lineItems ?? []).reduce((sum, li) => sum + (li.quantity ?? 0), 0);

    /*
     * A stable, same-origin link. The single-use handoff code is minted server-side
     * when the shopper navigates to it (see server/routes/checkout.ts) — it cannot be
     * pre-computed here because codes are single-use with a ~60s TTL.
     */
    const checkoutLink: Link | undefined =
      config.storefrontUrl ? { type: 'url', href: CHECKOUT_ENDPOINT_PATH } : undefined;

    return {
      entities: [
        $entity({
          id: cart.token ?? '',
          base: () => ({ totalQuantity, checkoutLink }),
          cost: () => mapCartCost(cart, context.swCurrency),
        }),
      ],
    };
  },
});
