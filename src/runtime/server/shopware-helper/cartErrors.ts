import { isSupportedCartLineItem } from './cartMapper';
import type { CartBatchResultItem, CartMessage, WELL_KNOWN_CART_MESSAGE_CODES } from '@laioutr-core/canonical-types';
import { Schemas } from '../types/storeApiTypes';

export type CartErrorEntry = {
  key?: string;
  level?: number;
  message?: string;
  translatedMessage?: string | null;
  messageKey?: string;
  block?: boolean;
};

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

/**
 * Each core error's `blockOrder()`, a constant of its class, for the Shopware versions that serialize
 * no `block` flag (6.5 to 6.6.6). A key also matches with a suffix, which is how Shopware names the
 * address a salutation or a region is missing on.
 */
const BLOCKS_ORDER: Record<string, boolean> = {
  'product-stock-reached': true,
  'product-out-of-stock': true,
  'product-not-found': true,
  'min-order-quantity': true,
  'purchase-steps-quantity': true,
  'promotion-not-found': false,
  'promotion-not-eligible': false,
  'promotion-excluded': false,
  'promotions-on-cart-price-zero-error': false,
  'promotion-discount-added': false,
  'promotion-discount-deleted': false,
  'auto-promotion-not-found': true,
  'shipping-method-blocked': true,
  'payment-method-blocked': true,
  'billing-address-blocked': true,
  'shipping-address-blocked': true,
  'billing-address-invalid': true,
  'shipping-address-invalid': true,
  'salutation-missing': true,
  'country-region-missing': true,
};

/** Shopware raises these again on every calculation (`isPersistent()` false): they stand on the cart, so they are no news to a write. */
const RAISED_ON_EVERY_CALCULATION: { messageKey: string; level?: Level }[] = [
  { messageKey: 'product-stock-reached', level: 'error' },
  { messageKey: 'shipping-method-blocked' },
  { messageKey: 'payment-method-blocked' },
  { messageKey: 'promotion-not-eligible' },
  { messageKey: 'promotion-not-eligible-not-logged-in' },
  { messageKey: 'promotion-not-eligible-specific-products' },
  { messageKey: 'promotion-excluded' },
  { messageKey: 'promotions-on-cart-price-zero-error' },
  { messageKey: 'promotion-discount-zero-value' },
  { messageKey: 'vat-id-missing' },
  { messageKey: 'billing-address-missing' },
  { messageKey: 'shipping-address-missing' },
  { messageKey: 'checkout-gateway-error' },
];

const entryOf = <T>(table: Record<string, T>, messageKey: string): T | undefined =>
  Object.entries(table).find(([key]) => messageKey === key || messageKey.startsWith(`${key}-`))?.[1];

const codeOf = (messageKey: string, level: Level): CartMessage['code'] => {
  const known = entryOf(WELL_KNOWN_CODES, messageKey);
  return (typeof known === 'object' ? known[level] : known) ?? messageKey;
};

const levelOf = (level: number | undefined): Level => {
  if ((level ?? 0) >= 20) return 'error';
  if ((level ?? 0) >= 10) return 'warning';
  return 'info';
};

const messageKeyOf = (error: CartErrorEntry): string => error.messageKey ?? error.key ?? 'unknown';

/** A placeholder Shopware never filled: `ProductNotFoundError` passes its format string as the message. */
const UNFILLED_PLACEHOLDER = /%[sd]\b/;

/**
 * The error's text in the request's language. Shopware 6.7.3 and later serialize `translatedMessage`,
 * the `checkout.<messageKey>` snippet in the context's locale, which is that id itself when the snippet
 * is missing; otherwise its English `message` is all there is.
 */
const textOf = (error: CartErrorEntry): string | undefined => {
  const { translatedMessage } = error;
  const translated =
    typeof translatedMessage === 'string' && translatedMessage !== '' && translatedMessage !== `checkout.${messageKeyOf(error)}` ?
      translatedMessage
    : undefined;
  const text = translated ?? error.message;
  return text && !UNFILLED_PLACEHOLDER.test(text) ? text : undefined;
};

/**
 * A Shopware cart error as a canonical message. Shopware 6.6.7 and later serialize the error's
 * `blockOrder()` as `block`; before, the table of core keys stands in, and a key it does not know
 * blocks at error level.
 */
const toCartMessage = (error: CartErrorEntry): CartMessage => {
  const level = levelOf(error.level);
  const messageKey = messageKeyOf(error);
  const message = textOf(error);
  return {
    code: codeOf(messageKey, level),
    level,
    ...(message ? { message } : {}),
    blocksCheckout: error.block ?? entryOf(BLOCKS_ORDER, messageKey) ?? level === 'error',
  };
};

const isRaisedOnEveryCalculation = (error: CartErrorEntry): boolean => {
  const messageKey = messageKeyOf(error);
  const level = levelOf(error.level);
  return RAISED_ON_EVERY_CALCULATION.some((entry) => entry.messageKey === messageKey && (entry.level ?? level) === level);
};

/**
 * The messages of a write's response that are news to it. What Shopware raises on every calculation
 * arrives with every write and stays on the cart's and its lines' messages instead.
 */
export const writeMessagesOf = (errors: CartErrors): CartMessage[] =>
  normalizeCartErrors(errors)
    .filter((error) => !isRaisedOnEveryCalculation(error))
    .map(toCartMessage);

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

const pushTo = <T>(map: Map<string, T[]>, key: string, value: T) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

/** Each of Shopware's errors and its message, in Shopware's order, with the ids of the lines it is about. */
const attributeMessages = (errors: CartErrors, lines: CartLine[]): { error: CartErrorEntry; message: CartMessage; lineIds: string[] }[] => {
  const linesBySubject = new Map<string, string[]>();
  for (const line of lines) {
    for (const subject of new Set([line.id, line.referencedId])) {
      // An automatic promotion's line has an empty `referencedId`, the id of an error about nothing.
      if (subject) pushTo(linesBySubject, subject, line.id);
    }
  }

  return normalizeCartErrors(errors).map((error) => ({
    error,
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

/** The cart's messages about each of its lines, by line id, attributed once for all of them. */
export const messagesByLineOf = (cart: CartWithErrors): Map<string, CartMessage[]> => {
  const byLine = new Map<string, CartMessage[]>();
  for (const { message, lineIds } of messagesOfCart(cart)) {
    for (const lineId of lineIds) pushTo(byLine, lineId, message);
  }
  return byLine;
};

/**
 * The line id this app adds a product under. Sent without a `referencedId`, it is also the product
 * Shopware takes the line to reference, and so the id its product errors carry.
 */
export const productLineIdOf = (product: { productId: string; variantId?: string }): string => product.variantId ?? product.productId;

type AddedProduct = { productId: string; variantId?: string; quantity: number };

/**
 * The outcome of each product of one add request, in its order, and the messages of the response not
 * reported as one.
 *
 * The response's lines decide it, not its errors. Shopware removes a line it cannot sell, sometimes
 * without an error about it (a container product, `product-not-found` keyed by the line's label), and
 * keeps a line when the lines of its product together ask for more than is in stock. A product whose
 * line is gone is refused with the first message about the line, or as `not-orderable`; one whose
 * line is there is added, and the messages about it are answered beside it.
 *
 * Shopware answers a line's total, not what one request added to it, so a product that was already in
 * the cart is reported with at most what its line holds, never more than it asked for.
 */
export const addedProductsOutcome = (
  products: AddedProduct[],
  cart: CartWithErrors
): { items: CartBatchResultItem[]; messages: CartMessage[] } => {
  const lineIds = products.map(productLineIdOf);
  const unclaimed = new Map((cart.lineItems ?? []).filter((li) => li.type === 'product').map((li) => [li.id, li.quantity]));
  const rejections = new Map<string, CartMessage>();
  const messages: CartMessage[] = [];

  const lines = [...new Set(lineIds)].map((id) => ({ id }));
  for (const { error, message, lineIds: about } of attributeMessages(cart.errors, lines)) {
    const refused = about.filter((id) => !unclaimed.has(id) && !rejections.has(id));
    for (const id of refused) rejections.set(id, message);
    if (refused.length === 0 && !isRaisedOnEveryCalculation(error)) messages.push(message);
  }

  const items = products.map(({ productId, variantId, quantity }, index): CartBatchResultItem => {
    const lineId = lineIds[index]!;
    const held = unclaimed.get(lineId);
    if (held === undefined) {
      const rejection = rejections.get(lineId);
      return {
        status: 'rejected',
        productId,
        variantId,
        reason: rejection?.code ?? 'not-orderable',
        ...(rejection?.message ? { reasonLabel: rejection.message } : {}),
      };
    }

    const added = Math.min(quantity, held);
    unclaimed.set(lineId, held - added);
    return { status: 'added', productId, variantId, quantity: added };
  });

  return { items, messages };
};

/**
 * Shopware's promotion errors about the cart rather than a submitted code: an automatic promotion
 * that lapsed, a discount it added or removed, a promotion worth nothing.
 */
const CART_PROMOTION_KEYS = new Set([
  'auto-promotion-not-found',
  'promotion-discount-added',
  'promotion-discount-deleted',
  'promotion-discount-zero-value',
  'promotions-on-cart-price-zero-error',
]);

/**
 * Whether a cart error is Shopware's refusal of a submitted discount code.
 *
 * Matching is by substring because the keys are not uniformly prefixed: a rejected code is
 * `promotion-not-found`, an ineligible one carries its reason as a suffix
 * (`promotion-not-eligible-<reason>`), and a plugin names its own refusals.
 */
const isCodeRefusal = (error: CartErrorEntry): boolean => {
  const key = error.messageKey ?? error.key ?? '';
  return key.includes('promotion') && !CART_PROMOTION_KEYS.has(key);
};

const isUnknownCode = (error: CartErrorEntry): boolean => toCartMessage(error).code === 'discount-not-found';

/**
 * The outcome of redeeming one discount code, its refusal as a message, and the messages of its
 * response not reported as it.
 *
 * Shopware removes the placeholder line item again when a code does not resolve, so an applied
 * promotion is the signal. Codes are matched verbatim — Shopware never folds case. An unknown code
 * is the batch's `not-found`; any other refusal is `discount-not-applicable`, labelled with
 * Shopware's text. A code not found is taken over any other refusal, because Shopware reports a
 * code redeemed earlier that no longer applies again on every write.
 *
 * Shopware's promotion errors name no code, and its cart holds one error per key: when two codes
 * are refused for the same reason, one refusal stands for both, and a code may be labelled with
 * another code's refusal.
 */
export const discountCodeOutcome = (
  code: string,
  cart: CartWithErrors
): { item: CartBatchResultItem; refusal?: CartMessage; messages: CartMessage[] } => {
  const errors = normalizeCartErrors(cart.errors);
  const applied = (cart.lineItems ?? []).some((li) => li.type === 'promotion' && li.referencedId === code);
  const refusals = applied ? [] : errors.filter(isCodeRefusal);
  const refusal = refusals.find(isUnknownCode) ?? refusals[0];
  const messages = writeMessagesOf(errors.filter((error) => error !== refusal));

  if (applied) return { item: { status: 'added', quantity: 1 }, messages };

  const label = refusal && textOf(refusal);
  return {
    item: {
      status: 'rejected',
      reason: !refusal || isUnknownCode(refusal) ? 'not-found' : 'discount-not-applicable',
      ...(label ? { reasonLabel: label } : {}),
    },
    ...(refusal ? { refusal: toCartMessage(refusal) } : {}),
    messages,
  };
};

const identityOf = (message: CartMessage): string => JSON.stringify(message);

/**
 * The `messages` a cart action answers, or nothing when Shopware reported none. A message that
 * several requests of one action report is answered once, and one equal to an item's refusal not at
 * all: Shopware raises a code's refusal again in the response to the next code.
 */
export const mutationMessages = (messages: CartMessage[], refusals: CartMessage[] = []): { messages: CartMessage[] } | undefined => {
  const refused = new Set(refusals.map(identityOf));
  const unique = [...new Map(messages.map((message) => [identityOf(message), message])).values()].filter(
    (message) => !refused.has(identityOf(message))
  );
  return unique.length > 0 ? { messages: unique } : undefined;
};
