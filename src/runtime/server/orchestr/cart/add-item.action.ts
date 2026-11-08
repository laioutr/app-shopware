import { CartAddItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import type { CartBatchResultItem, CartMessage } from '@laioutr-core/canonical-types';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { addedProductsOutcome, discountCodeOutcome, mutationMessages, productLineIdOf } from '../../shopware-helper/cartErrors';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

export default defineShopwareAction(CartAddItemsAction, async ({ event, context, input }) => {
  const { storefrontClient } = context;

  /**
   * Persist the token only when it actually changed. This action can issue several requests —
   * the products in one batch, then a request per discount code — and each answers with the
   * same session token, while `shopware:context-token:changed` fires on every persist. A host
   * app mirroring the token into its own store should hear about one change, not one per
   * request. Persisting eagerly rather than once at the end keeps a token Shopware minted on
   * an earlier request even if a later one throws.
   */
  let persistedToken: string | undefined;
  const persistToken = async (token: string | null | undefined) => {
    if (!token || token === persistedToken) return;
    persistedToken = token;
    await persistContextToken(event, token);
  };

  // What Shopware reported beyond each item's outcome, across every request of this action.
  const messages: CartMessage[] = [];
  const refusals: CartMessage[] = [];

  const products = input.filter((i) => i.type === 'product');
  let productItems: CartBatchResultItem[] = [];

  if (products.length > 0) {
    const cart = await storefrontClient.invoke('addLineItem post /checkout/cart/line-item', {
      body: {
        items: products.map((product) => ({
          children: {},
          deliveryInformation: { apiAlias: 'cart_delivery_information' },
          id: productLineIdOf(product),
          payload: {
            type: product.type,
            id: productLineIdOf(product),
          },
          quantity: product.quantity,
          states: ['is-physical'],
          type: product.type,
        })),
      },
    });

    await persistToken(cart.data.token);

    const outcome = addedProductsOutcome(products, cart.data);
    productItems = outcome.items;
    messages.push(...outcome.messages);
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

    await persistToken(cart.data.token);

    const outcome = discountCodeOutcome(code, cart.data);
    messages.push(...outcome.messages);
    if (outcome.refusal) refusals.push(outcome.refusal);
    return outcome.item;
  };

  // Built in input order, which is the order the canonical batch result is read back in.
  const items: CartBatchResultItem[] = [];
  let nextProduct = 0;

  for (const item of input) {
    if (item.type === 'product') {
      items.push(productItems[nextProduct++]!);
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

  return { items, ...mutationMessages(messages, refusals) };
});
