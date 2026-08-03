import { toCategoryPageMeta } from './pageIndexEntries';
import type { StorefrontClient } from '../types/shopware';
import type { PageIndexLocateResult } from '@laioutr-core/core-types/orchestr';

/** Mirrors the enumerate criteria's metadata fields; `seoUrls` is absent because `locate` already has the slug from the URL. */
const metaCriteria = {
  associations: { media: {} },
  includes: {
    category: ['id', 'name', 'translated', 'updatedAt', 'media'],
    media: ['url'],
  },
};

/**
 * Read a resolved category's page metadata for `pageIndex.locate`. Translations follow the client's
 * `sw-language-id`, so the name comes back in the locale the lookup was made in.
 *
 * Swallows a missing category and a failed read — metadata is a labelling nicety and must never cost
 * the caller the subject it already resolved.
 */
export const readCategoryPageMeta = async (
  storefrontClient: StorefrontClient,
  categoryId: string
): Promise<PageIndexLocateResult['meta']> => {
  try {
    const response = await storefrontClient.invoke('readCategoryList post /category', {
      body: { ...metaCriteria, ids: [categoryId], limit: 1 },
    });
    const category = response.data.elements?.[0];

    return category ? toCategoryPageMeta(category) : undefined;
  } catch {
    return undefined;
  }
};
