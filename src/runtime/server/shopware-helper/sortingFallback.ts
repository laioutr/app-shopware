import { shopwareErrorCodes } from './shopwareErrors';

/**
 * Run a listing read with the requested sort key, and again without one if Shopware rejects it.
 *
 * Before 6.7, a key the shop does not offer — stale in a bookmarked URL, set in Studio, or a sorting
 * the merchant has since disabled — answers 404 `PRODUCT_SORTING_NOT_FOUND` and fails the whole
 * listing. 6.7 falls back to the default sorting itself.
 */
export const withSortingFallback = async <R>(order: string | undefined, read: (order: string | undefined) => R): Promise<Awaited<R>> => {
  try {
    return await read(order);
  } catch (err) {
    if (order === undefined || !shopwareErrorCodes(err).includes('PRODUCT_SORTING_NOT_FOUND')) throw err;
    const unsorted = await read(undefined);
    return unsorted;
  }
};
