import { consola } from 'consola';
import { Schemas } from '../types/storeApiTypes';

const logger = consola.withTag('shopware/cart');

export type CartErrorEntry = { key?: string; level?: number; message?: string; messageKey?: string };

type CartErrors = Schemas['Cart']['errors'] | CartErrorEntry[];

const normalizeCartErrors = (errors: CartErrors): CartErrorEntry[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors;
  return Object.values(errors);
};

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
 * Blocking errors (`level: 20`) throw a generic error with the Shopware message.
 * Notices (`level: 0`) and warnings (`level: 10`) are logged, not dropped, so cart-side
 * issues stay diagnosable without failing the mutation. (Mapping to canonical
 * Product* errors is deferred — Shopware's CartError shape carries no reliable
 * variant reference.)
 */
export const handleCartMutationErrors = (errors: CartErrors): void => {
  for (const error of normalizeCartErrors(errors)) {
    const level = error.level ?? 0;
    const detail = { key: error.key, messageKey: error.messageKey, message: error.message };

    if (level >= 20) {
      throw new Error(`Shopware cart error: ${error.messageKey ?? error.key ?? 'unknown'} — ${error.message ?? ''}`.trim());
    }
    if (level >= 10) {
      logger.warn('Cart warning', detail);
    } else {
      logger.info('Cart notice', detail);
    }
  }
};
