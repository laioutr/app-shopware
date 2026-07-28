import { toProductPageMeta } from './pageIndexRows';
import type { StorefrontClient } from '../types/shopware';
import type { PageLocateResult } from '@laioutr-core/core-types/orchestr';

/** Mirrors the enumerate criteria's metadata fields; `seoUrls` is absent because `locate` already has the slug from the URL. */
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
 * Swallows a missing product and a failed read — metadata is a labelling nicety and must never cost
 * the caller the subject it already resolved.
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
