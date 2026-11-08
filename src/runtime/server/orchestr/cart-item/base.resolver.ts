import {
  CartItemAvailability,
  CartItemBase,
  CartItemCost,
  CartItemMessages,
  CartItemProductData,
  CartItemQuantityRule,
} from '@laioutr-core/canonical-types/entity/cart-item';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { lineMessagesOf } from '../../shopware-helper/cartErrors';
import { isSupportedCartLineItem, mapCartItem, mapDiscountItem } from '../../shopware-helper/cartMapper';
import { getCart } from '../../shopware-helper/getCart';

export default defineShopwareComponentResolver({
  entityType: 'CartItem',
  label: 'Shopware Cart Item Component Resolver',
  provides: [CartItemBase, CartItemCost, CartItemAvailability, CartItemQuantityRule, CartItemProductData, CartItemMessages],
  resolve: async ({ entityIds, context, $entity, passthrough }) => {
    const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
    passthrough.set(cartFragmentToken, cart);

    const lineItemsById = new Map((cart.lineItems ?? []).map((li) => [li.id, li]));

    const entities = entityIds
      .map((id) => lineItemsById.get(id))
      .filter((li): li is NonNullable<typeof li> => !!li && isSupportedCartLineItem(li))
      .map((li) => {
        const { id } = li;
        const mapped = li.type === 'promotion' ? mapDiscountItem(li, context.currency) : mapCartItem(li, context.currency);
        return $entity({
          id,
          base: () => mapped.base,
          cost: () => mapped.cost,
          availability: () => mapped.availability,
          quantityRule: () => mapped.quantityRule,
          productData: () => mapped.productData,
          messages: () => ({ messages: lineMessagesOf(cart, id) }),
        });
      });

    return { entities };
  },
});
