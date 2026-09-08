import { CartAddItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import type { CartBatchResultItem } from '@laioutr-core/canonical-types';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { handleCartMutationErrors, takeDiscountCodeErrors } from '../../shopware-helper/cartErrors';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

export default defineShopwareAction(CartAddItemsAction, async ({ event, context, input }) => {
  const { storefrontClient } = context;

  const products = input.filter((i) => i.type === 'product');

  if (products.length > 0) {
    const cart = await storefrontClient.invoke('addLineItem post /checkout/cart/line-item', {
      body: {
        items: products.map((product) => ({
          children: {},
          deliveryInformation: { apiAlias: 'cart_delivery_information' },
          id: product.variantId ?? product.productId,
          payload: {
            type: product.type,
            id: product.variantId ?? product.productId,
          },
          quantity: product.quantity,
          states: ['is-physical'],
          type: product.type,
        })),
      },
    });

    await persistContextToken(event, cart.data.token);
    handleCartMutationErrors(cart.data.errors);
  }

  /**
   * Redeem one discount code.
   *
   * Shopware takes the code as the promotion line item's `referencedId`, and its cart errors
   * name no code, so one code per request is what makes an outcome attributable.
   */
  const redeemDiscountCode = async (code: string): Promise<CartBatchResultItem> => {
    const cart = await storefrontClient.invoke('addLineItem post /checkout/cart/line-item', {
      body: { items: [{ type: 'promotion' as const, referencedId: code }] },
    });

    await persistContextToken(event, cart.data.token);

    const { rejections, rest } = takeDiscountCodeErrors(cart.data.errors);
    handleCartMutationErrors(rest);

    // Shopware removes the placeholder line item again when a code does not resolve, so an
    // applied promotion is the signal. Codes are matched verbatim — Shopware never folds case.
    const applied = (cart.data.lineItems ?? []).some((li) => li.type === 'promotion' && li.referencedId === code);
    if (applied) return { status: 'added' as const, quantity: 1 };

    // An unknown code is the canonical `not-found`; the rest of Shopware's promotion errors —
    // ineligible, excluded, already redeemed — have no well-known counterpart, so its own key
    // travels as the reason and its message as the label.
    const [rejection] = rejections;
    const key = rejection?.messageKey ?? rejection?.key;
    return {
      status: 'rejected' as const,
      reason: key === 'promotion-not-found' || key === undefined ? 'not-found' : key,
      reasonLabel: rejection?.message,
    };
  };

  // Built in input order, which is the order the canonical batch result is read back in.
  const items: CartBatchResultItem[] = [];

  for (const item of input) {
    if (item.type === 'product') {
      items.push({
        status: 'added' as const,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    } else if (item.type === 'discount-code') {
      items.push(await redeemDiscountCode(item.code));
    } else {
      // SKU resolution and custom line items are not implemented for Shopware yet — report
      // the rows as rejected instead of dropping them silently.
      items.push({
        status: 'rejected' as const,
        ...(item.type === 'sku' ? { sku: item.sku } : {}),
        reason: 'not-supported',
      });
    }
  }

  return { items };
});
