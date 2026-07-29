import { entitySlug } from './mappers/slugMapper';
import { swTranslated } from './swTranslated';
import type { ShopwareProduct } from '../types/shopware';
import type { PageIndexEntry } from '@laioutr-core/core-types/orchestr';

/**
 * Shared by `query` entries and `locate` results so both describe a product page identically.
 *
 * `previewImage` is the cover media's **plain** URL, deliberately not `mapMedia`: its encoded srcset
 * can't be dereferenced by the consumers that read `PageIndexEntry.meta.previewImage` (Cockpit picker,
 * sitemaps, indexers), which all live outside the Nuxt image pipeline.
 */
export const toProductPageMeta = (product: ShopwareProduct): PageIndexEntry['meta'] => ({
  title: swTranslated(product, 'name') ?? product.id,
  previewImage: product.cover?.media?.url,
  lastModified: product.updatedAt ?? undefined,
});

export const toProductPageEntry = (product: ShopwareProduct): PageIndexEntry => ({
  params: { slug: entitySlug(product) },
  subject: { type: 'Product', id: product.id },
  meta: toProductPageMeta(product),
});
