import { isSupportedCartLineItem } from './cartMapper';
import type { CartBatchResultItem, CartMessage, WELL_KNOWN_CART_MESSAGE_CODES } from '@laioutr-core/canonical-types';
import { Schemas } from '../types/storeApiTypes';

export type CartErrorEntry = { key?: string; level?: number; message?: string; messageKey?: string; block?: boolean };

type CartErrors = Schemas['Cart']['errors'] | CartErrorEntry[];

type Level = CartMessage['level'];

type WellKnownCode = (typeof WELL_KNOWN_CART_MESSAGE_CODES)[number];

const normalizeCartErrors = (errors: CartErrors): CartErrorEntry[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors;
  return Object.values(errors);
};

/**
 * The well-known code each Shopware message key stands for. `product-stock-reached` is either, by
 * its level: a warning when Shopware lowered the quantity to the stock, an error when the lines of
 * one product together ask for more than is in stock. A key also matches with a suffix, which is how
 * Shopware appends its reason to `promotion-not-eligible`.
 */
const WELL_KNOWN_CODES: Record<string, WellKnownCode | Partial<Record<Level, WellKnownCode>>> = {
  'product-stock-reached': { warning: 'quantity-adjusted', error: 'not-enough-stock' },
  'product-out-of-stock': 'sold-out',
  'product-not-found': 'not-found',
  'min-order-quantity': 'below-minimum-quantity',
  'purchase-steps-quantity': 'invalid-quantity-increment',
  'promotion-not-eligible': 'discount-not-applicable',
  'promotion-excluded': 'discount-not-applicable',
  'promotion-not-found': 'discount-not-found',
  'shipping-method-blocked': 'shipping-method-unavailable',
  'payment-method-blocked': 'payment-method-unavailable',
};

const codeOf = (messageKey: string, level: Level): CartMessage['code'] => {
  const known = Object.entries(WELL_KNOWN_CODES).find(([key]) => messageKey === key || messageKey.startsWith(`${key}-`))?.[1];
  return (typeof known === 'object' ? known[level] : known) ?? messageKey;
};

const levelOf = (level: number | undefined): Level => {
  if ((level ?? 0) >= 20) return 'error';
  if ((level ?? 0) >= 10) return 'warning';
  return 'info';
};

/**
 * A Shopware cart error as a canonical message. Shopware 6.6 and later serialize the error's
 * `blockOrder()` as `block`; 6.5 serializes no block flag, so there an error-level message blocks.
 */
const toCartMessage = (error: CartErrorEntry): CartMessage => {
  const level = levelOf(error.level);
  return {
    code: codeOf(error.messageKey ?? error.key ?? 'unknown', level),
    level,
    ...(error.message ? { message: error.message } : {}),
    blocksCheckout: error.block ?? level === 'error',
  };
};

export const toCartMessages = (errors: CartErrors): CartMessage[] => normalizeCartErrors(errors).map(toCartMessage);

/** A cart line as Shopware keys its errors: by the product it references, or by its own id. */
type CartLine = { id: string; referencedId?: string };

/**
 * The id a Shopware error is about. Its `key` is its message key followed by that id: the product a
 * line references for the stock and quantity errors, the line's label or id for `product-not-found`,
 * a method's name for a blocked shipping or payment method. A promotion error's key is its message
 * key alone, so it is about nothing: an empty id.
 */
const subjectOf = (error: CartErrorEntry): string =>
  error.key && error.messageKey && error.key.startsWith(error.messageKey) ? error.key.slice(error.messageKey.length) : '';

/** Each of Shopware's errors as a message, in Shopware's order, with the ids of the lines it is about. */
const attributeMessages = (errors: CartErrors, lines: CartLine[]): { message: CartMessage; lineIds: string[] }[] => {
  const linesBySubject = new Map<string, string[]>();
  for (const line of lines) {
    for (const subject of new Set([line.id, line.referencedId])) {
      // An automatic promotion's line has an empty `referencedId`, the id of an error about nothing.
      if (subject) linesBySubject.set(subject, [...(linesBySubject.get(subject) ?? []), line.id]);
    }
  }

  return normalizeCartErrors(errors).map((error) => ({
    message: toCartMessage(error),
    lineIds: linesBySubject.get(subjectOf(error)) ?? [],
  }));
};

type CartWithErrors = Pick<Schemas['Cart'], 'errors' | 'lineItems'>;

const messagesOfCart = (cart: CartWithErrors) => attributeMessages(cart.errors, (cart.lineItems ?? []).filter(isSupportedCartLineItem));

/** The cart's messages that are not about one of the lines it exposes. */
export const cartMessagesOf = (cart: CartWithErrors): CartMessage[] =>
  messagesOfCart(cart)
    .filter(({ lineIds }) => lineIds.length === 0)
    .map(({ message }) => message);

/** The cart's messages about one of its lines. */
export const lineMessagesOf = (cart: CartWithErrors, lineId: string): CartMessage[] =>
  messagesOfCart(cart)
    .filter(({ lineIds }) => lineIds.includes(lineId))
    .map(({ message }) => message);

/**
 * The line id this app adds a product under. Sent without a `referencedId`, it is also the product
 * Shopware takes the line to reference, and so the id its product errors carry.
 */
export const productLineIdOf = (product: { productId: string; variantId?: string }): string => product.variantId ?? product.productId;

type AddedProduct = { productId: string; variantId?: string; quantity: number };

/**
 * The outcome of each product of one add request, in its order, and the messages of the response not
 * reported as one. A product is refused with the first error about its line — Shopware removed the
 * line (sold out, not found) or cannot hold its quantity. A warning, such as a quantity lowered to
 * the stock, leaves it added.
 */
export const addedProductsOutcome = (
  products: AddedProduct[],
  errors: CartErrors
): { items: CartBatchResultItem[]; messages: CartMessage[] } => {
  const lines = products.map((product) => ({ id: productLineIdOf(product) }));
  const rejections = new Map<string, CartMessage>();
  const messages: CartMessage[] = [];

  for (const { message, lineIds } of attributeMessages(errors, lines)) {
    const refused = message.level === 'error' ? lineIds.filter((id) => !rejections.has(id)) : [];
    for (const id of refused) rejections.set(id, message);
    if (refused.length === 0) messages.push(message);
  }

  const items = products.map(({ productId, variantId, quantity }): CartBatchResultItem => {
    const rejection = rejections.get(productLineIdOf({ productId, variantId }));
    if (!rejection) return { status: 'added', productId, variantId, quantity };
    return {
      status: 'rejected',
      productId,
      variantId,
      reason: rejection.code,
      ...(rejection.message ? { reasonLabel: rejection.message } : {}),
    };
  });

  return { items, messages };
};

/**
 * Shopware's key for an automatic promotion that stopped applying. It shares the error level
 * of a rejected code but sets `blockOrder(): true`, so it stays a blocking cart message rather
 * than a code's refusal.
 */
const autoPromotionNotFoundKey = 'auto-promotion-not-found';

/**
 * Whether a cart error is Shopware's refusal of a submitted discount code.
 *
 * Matching is by substring because the keys are not uniformly prefixed: a rejected code is
 * `promotion-not-found`, an ineligible one carries its reason as a suffix
 * (`promotion-not-eligible-<reason>`), and the automatic-promotion key leads with `auto-`.
 */
const isCodeRefusal = (error: CartErrorEntry): boolean => {
  const key = error.messageKey ?? error.key ?? '';
  return key.includes('promotion') && key !== autoPromotionNotFoundKey;
};

const isUnknownCode = (error: CartErrorEntry): boolean => toCartMessage(error).code === 'discount-not-found';

/**
 * The outcome of redeeming one discount code, and the messages of its response not reported as it.
 *
 * Shopware removes the placeholder line item again when a code does not resolve, so an applied
 * promotion is the signal. Codes are matched verbatim — Shopware never folds case. An unknown code
 * is the batch's `not-found`; any other refusal is `discount-not-applicable`, labelled with
 * Shopware's message. A code not found is taken over any other refusal, because Shopware reports a
 * code redeemed earlier that no longer applies again on every write.
 */
export const discountCodeOutcome = (code: string, cart: CartWithErrors): { item: CartBatchResultItem; messages: CartMessage[] } => {
  const errors = normalizeCartErrors(cart.errors);
  const applied = (cart.lineItems ?? []).some((li) => li.type === 'promotion' && li.referencedId === code);
  const refusals = applied ? [] : errors.filter(isCodeRefusal);
  const refusal = refusals.find(isUnknownCode) ?? refusals[0];
  const messages = errors.filter((error) => error !== refusal).map(toCartMessage);

  if (applied) return { item: { status: 'added', quantity: 1 }, messages };

  return {
    item: {
      status: 'rejected',
      reason: !refusal || isUnknownCode(refusal) ? 'not-found' : 'discount-not-applicable',
      ...(refusal?.message ? { reasonLabel: refusal.message } : {}),
    },
    messages,
  };
};

/**
 * The `messages` a cart action answers, or nothing when Shopware reported none. A message that
 * several requests of one action report — one Shopware raises again on every write — is answered once.
 */
export const mutationMessages = (messages: CartMessage[]): { messages: CartMessage[] } | undefined => {
  const unique = [...new Map(messages.map((message) => [JSON.stringify(message), message])).values()];
  return unique.length > 0 ? { messages: unique } : undefined;
};
