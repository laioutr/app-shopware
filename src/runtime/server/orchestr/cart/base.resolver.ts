import { getRequestURL, useRuntimeConfig } from '#imports';
import { CartBase, CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { Link } from '@laioutr-core/core-types/common';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { mapCartCost } from '../../shopware-helper/cartMapper';
import { buildCheckoutUrl } from '../../shopware-helper/checkoutUrl';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareComponentResolver({
  entityType: 'Cart',
  label: 'Shopware Cart Component Resolver',
  provides: [CartBase, CartCost],
  resolve: async ({ event, context, $entity, passthrough }) => {
    /* Cart is identified per unique context session */
    const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
    passthrough.set(cartFragmentToken, cart);

    const config = useRuntimeConfig()['@laioutr-app/shopware'];
    const totalQuantity = (cart.lineItems ?? []).reduce((sum, li) => sum + (li.quantity ?? 0), 0);

    const checkoutLink: Link | undefined =
      config.storefrontUrl && cart.token ?
        {
          type: 'url',
          href: buildCheckoutUrl({
            storefrontUrl: config.storefrontUrl,
            contextToken: cart.token,
            origin: getRequestURL(event).origin,
          }),
        }
      : undefined;

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
