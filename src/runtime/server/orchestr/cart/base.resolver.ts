import { useRuntimeConfig } from '#imports';
import { CartBase, CartCost } from '@laioutr-core/canonical-types/entity/cart';
import { Link } from '@laioutr-core/core-types/common';
import { Checkout } from '../../../shared/pageTypes/checkout.pagetype';
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

    const config = useRuntimeConfig()['@laioutr/app-shopware'];
    const totalQuantity = (cart.lineItems ?? []).reduce((sum, li) => sum + (li.quantity ?? 0), 0);

    /*
     * Link to the merchant's Studio checkout page (whichever page they tag with the
     * `Checkout` page type), which hosts the embedded-storefront section. The section's
     * iframe performs the actual same-origin session handoff (see server/routes/checkout.ts).
     * Gated on `storefrontUrl`: with no storefront configured there is nothing to embed.
     */
    const checkoutLink: Link | undefined =
      config.storefrontUrl ? { type: 'pageType', pageType: Checkout } : undefined;

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
