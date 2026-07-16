import { consola } from 'consola';
import { Schemas } from '../types/storeApiTypes';

const logger = consola.withTag('shopware/cart');

type CartErrorEntry = { key?: string; level?: number; message?: string; messageKey?: string };

const normalizeCartErrors = (errors: Schemas['Cart']['errors']): CartErrorEntry[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors;
  return Object.values(errors);
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
export const handleCartMutationErrors = (errors: Schemas['Cart']['errors']): void => {
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
