import { toProductPageMeta } from './pageIndexRows';
import type { StorefrontClient } from '../types/shopware';
import type { PageLocateResult } from '@laioutr-core/core-types/common';

/**
 * The same fields and associations the enumerate criteria selects for a row's metadata, so a located
 * page and an enumerated one describe themselves identically. `seoUrls` is deliberately absent —
 * `locate` already knows the slug, it came in on the URL.
 */
const metaCriteria = {
  associations: { cover: {} },
  includes: {
    product: ['id', 'name', 'translated', 'updatedAt', 'cover'],
    product_media: ['media'],
    media: ['url'],
  },
};

/**
 * Read a resolved product's page metadata for `pageIndex.locate`. Translations follow the client's
 * `sw-language-id`, so the name comes back in the locale the lookup was made in.
 *
 * Returns `undefined` when the product is gone or the read fails: metadata is a labelling nicety and
 * must never cost the caller the subject it already resolved.
 */
export const readProductPageMeta = async (storefrontClient: StorefrontClient, productId: string): Promise<PageLocateResult['meta']> => {
  try {
    const response = await storefrontClient.invoke('readProduct post /product', {
      body: { ...metaCriteria, ids: [productId], limit: 1 },
    });
    const product = response.data.elements?.[0];

    return product ? toProductPageMeta(product) : undefined;
  } catch {
    return undefined;
  }
};
