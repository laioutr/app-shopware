import {
  CartItemAvailability,
  CartItemBase,
  CartItemCost,
  CartItemProductData,
  CartItemQuantityRule,
} from '@laioutr-core/canonical-types/entity/cart-item';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { isSupportedCartLineItem, mapCartItem, mapDiscountItem } from '../../shopware-helper/cartMapper';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareComponentResolver({
  entityType: 'CartItem',
  label: 'Shopware Cart Item Component Resolver',
  provides: [CartItemBase, CartItemCost, CartItemAvailability, CartItemQuantityRule, CartItemProductData],
  resolve: async ({ entityIds, context, $entity, passthrough }) => {
    const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
    passthrough.set(cartFragmentToken, cart);

    const lineItemsById = new Map((cart.lineItems ?? []).map((li) => [li.id, li]));

    const entities = entityIds
      .map((id) => lineItemsById.get(id))
      .filter((li): li is NonNullable<typeof li> => !!li && isSupportedCartLineItem(li))
      .map((li) => {
        const mapped = li.type === 'promotion' ? mapDiscountItem(li, context.swCurrency) : mapCartItem(li, context.swCurrency);
        return $entity({
          id: li.id,
          base: () => mapped.base,
          cost: () => mapped.cost,
          availability: () => mapped.availability,
          quantityRule: () => mapped.quantityRule,
          productData: () => mapped.productData,
        });
      });

    return { entities };
  },
});
