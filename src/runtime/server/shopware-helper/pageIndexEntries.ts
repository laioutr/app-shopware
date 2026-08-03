import { entitySlug } from './mappers/slugMapper';
import { swTranslated } from './swTranslated';
import type { ShopwareCategory, ShopwareProduct } from '../types/shopware';
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

/**
 * Shared by `list`/`search` entries and `locate` results so both describe a category page identically.
 *
 * `previewImage` is the category media's plain URL for the same reason the product mapper uses one:
 * the consumers that read it run outside the Nuxt image pipeline and cannot dereference an encoded
 * srcset.
 */
export const toCategoryPageMeta = (category: ShopwareCategory): PageIndexEntry['meta'] => ({
  title: swTranslated(category, 'name') ?? category.name,
  previewImage: category.media?.url,
  lastModified: category.updatedAt ?? undefined,
});

export const toCategoryPageEntry = (category: ShopwareCategory): PageIndexEntry => ({
  params: { slug: entitySlug(category) },
  subject: { type: 'Category', id: category.id },
  meta: toCategoryPageMeta(category),
});
