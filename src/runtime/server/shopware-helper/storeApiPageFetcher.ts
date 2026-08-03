import type { PageIndexEntry } from '@laioutr-core/core-types/orchestr';

/** Shopware's store API caps `limit` at MAX_LIMIT; a larger value is rejected with a 400. */
export const SHOPWARE_MAX_LIMIT = 100;

/**
 * Build the page-fetch closure `paginate` drives for a store-API list endpoint paged by number.
 *
 * Takes a read thunk rather than an endpoint name so the caller keeps the client's per-operation
 * typing, and stays free of `#imports` so it remains unit-testable — the handler owns `paginate`.
 */
export const storeApiPageFetcher =
  <TItem>(
    readPage: (args: { page: number; limit: number }) => Promise<{ elements?: TItem[] }>,
    toEntry: (item: TItem) => PageIndexEntry,
    batchSize: number
  ) =>
  async ({ cursor }: { cursor: string | undefined }) => {
    const page = cursor ? Number(cursor) : 1;
    const elements = (await readPage({ page, limit: batchSize })).elements ?? [];

    return {
      entries: elements.map(toEntry),
      // A short page ends the walk; an enumeration that divides exactly costs one extra empty read.
      nextCursor: elements.length < batchSize ? undefined : String(page + 1),
    };
  };
