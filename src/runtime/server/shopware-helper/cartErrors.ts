import { UnprocessableEntityError } from '@ebec/http';
import { consola } from 'consola';
import { Schemas } from '../types/storeApiTypes';

const logger = consola.withTag('shopware/cart');

export type CartErrorEntry = {
  key?: string;
  level?: number;
  message?: string;
  messageKey?: string;
  parameters?: Record<string, unknown> | unknown[];
  block?: boolean;
  [property: string]: unknown;
};

type CartErrors = Schemas['Cart']['errors'] | CartErrorEntry[];

const normalizeCartErrors = (errors: CartErrors): CartErrorEntry[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors;
  return Object.values(errors) as CartErrorEntry[];
};

/**
 * A Shopware cart error in a shape a storefront can translate: `key` is Shopware's message key
 * (`product-stock-reached`, `min-order-quantity`, …), the same key its own storefront snippets use,
 * and `parameters` fill the placeholders of that message.
 */
export type CartMessage = {
  key: string;
  /** Shopware's id for this occurrence: the message key plus the line item or method it concerns. */
  id?: string;
  level: 'notice' | 'warning' | 'error';
  message?: string;
  parameters: Record<string, unknown>;
  /** Whether Shopware refuses to place the order while this error stands. */
  blocksOrder: boolean;
};

/** Serialization fields of a Shopware cart error; whatever else it carries is a message parameter. */
const ERROR_META_FIELDS = new Set([
  'key',
  'level',
  'message',
  'messageKey',
  'translatedMessage',
  'parameters',
  'block',
  'blockResubmit',
  'route',
  'code',
  'file',
  'line',
]);

/**
 * Message parameters of a cart error. Shopware serializes them as `parameters` since 6.5; older
 * versions serialize the error's own properties instead, which then are the parameters.
 */
const parametersOf = (error: CartErrorEntry): Record<string, unknown> => {
  if (error.parameters && !Array.isArray(error.parameters)) return error.parameters;
  return Object.fromEntries(Object.entries(error).filter(([field]) => !ERROR_META_FIELDS.has(field)));
};

const levelOf = (level: number | undefined): CartMessage['level'] => {
  if ((level ?? 0) >= 20) return 'error';
  if ((level ?? 0) >= 10) return 'warning';
  return 'notice';
};

export const toCartMessages = (errors: CartErrors): CartMessage[] =>
  normalizeCartErrors(errors).map((error) => ({
    key: error.messageKey ?? error.key ?? 'unknown',
    ...(error.key ? { id: error.key } : {}),
    level: levelOf(error.level),
    ...(error.message ? { message: error.message } : {}),
    parameters: parametersOf(error),
    blocksOrder: error.block ?? (error.level ?? 0) >= 20,
  }));

/**
 * The blocking errors of a cart mutation. A 422 rather than a 500: the request was well-formed, the
 * cart refused it — out of stock, below the minimum quantity — and the caller can act on that.
 */
export class ShopwareCartError extends UnprocessableEntityError {
  static readonly code = 'SHOPWARE_CART_ERROR';
  declare data: { errors: CartMessage[] };

  constructor(errors: CartMessage[]) {
    super({
      message: `Shopware cart error: ${errors.map((error) => `${error.key}${error.message ? ` — ${error.message}` : ''}`).join('; ')}`,
      code: ShopwareCartError.code,
    });
    this.data = { errors };
  }
}

/**
 * Shopware's key for an automatic promotion that stopped applying. It shares the error level
 * of a rejected code but sets `blockOrder(): true`, so it stays a blocking cart error.
 */
const autoPromotionNotFoundKey = 'auto-promotion-not-found';

/**
 * Split the cart errors that describe a submitted discount code off from the rest.
 *
 * `CartAddItemsAction` reports a code it could not redeem as a per-item rejection instead of
 * failing the whole call, so these are handed back to the caller rather than thrown. Shopware
 * levels `promotion-not-found` at 20 — the threshold `handleCartMutationErrors` throws on —
 * while setting `blockOrder(): false` on it.
 *
 * Matching is by substring because the keys are not uniformly prefixed: a rejected code is
 * `promotion-not-found`, an ineligible one carries its reason as a suffix
 * (`promotion-not-eligible-<reason>`), and the automatic-promotion key leads with `auto-`.
 */
export const takeDiscountCodeErrors = (errors: CartErrors): { rejections: CartErrorEntry[]; rest: CartErrorEntry[] } => {
  const rejections: CartErrorEntry[] = [];
  const rest: CartErrorEntry[] = [];

  for (const error of normalizeCartErrors(errors)) {
    const key = error.messageKey ?? error.key ?? '';
    if (key.includes('promotion') && key !== autoPromotionNotFoundKey) rejections.push(error);
    else rest.push(error);
  }

  return { rejections, rest };
};

/**
 * Inspect the `errors` of a Shopware cart mutation response.
 *
 * Blocking errors (`level: 20`) throw one {@link ShopwareCartError} carrying all of them.
 * Notices (`level: 0`) and warnings (`level: 10`) are logged, not dropped, so cart-side issues
 * stay diagnosable without failing the mutation; the cart read exposes them to the storefront.
 */
export const handleCartMutationErrors = (errors: CartErrors): void => {
  const messages = toCartMessages(errors);

  for (const message of messages) {
    const detail = { key: message.key, id: message.id, message: message.message };
    if (message.level === 'warning') logger.warn('Cart warning', detail);
    if (message.level === 'notice') logger.info('Cart notice', detail);
  }

  const blocking = messages.filter((message) => message.level === 'error');
  if (blocking.length > 0) throw new ShopwareCartError(blocking);
};
