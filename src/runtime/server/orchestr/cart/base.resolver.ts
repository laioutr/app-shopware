import { useRuntimeConfig } from '#imports';
import { CartBase, CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { mapCartCost } from '../../shopware-helper/cartMapper';
import { resolveCheckoutLink } from '../../shopware-helper/checkoutLink';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareComponentResolver({
  entityType: 'Cart',
  label: 'Shopware Cart Component Resolver',
  provides: [CartBase, CartCost],
  resolve: async ({ context, $entity, passthrough }) => {
    /* Cart is identified per unique context session */
    const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
    passthrough.set(cartFragmentToken, cart);

    const config = useRuntimeConfig()['@laioutr/app-shopware'];
    const totalQuantity = (cart.lineItems ?? []).reduce((sum, li) => sum + (li.quantity ?? 0), 0);

    const checkoutLink = resolveCheckoutLink({ ...config, origin: context.origin });

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
