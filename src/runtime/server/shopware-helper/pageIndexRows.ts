import { entitySlug } from './mappers/slugMapper';
import { swTranslated } from './swTranslated';
import type { ShopwareProduct } from '../types/shopware';
import type { PageRow } from '@laioutr-core/core-types/common';

/**
 * Shared by `query` rows and `locate` results so both describe a product page identically.
 *
 * `previewImage` is the cover media's **plain** URL, deliberately not `mapMedia`: its encoded srcset
 * can't be dereferenced by the consumers that read `PageRow.meta.previewImage` (Cockpit picker,
 * sitemaps, indexers), which all live outside the Nuxt image pipeline.
 */
export const toProductPageMeta = (product: ShopwareProduct): PageRow['meta'] => ({
  title: swTranslated(product, 'name') ?? product.id,
  previewImage: product.cover?.media?.url,
  lastModified: product.updatedAt ?? undefined,
});

export const toProductPageRow = (product: ShopwareProduct): PageRow => ({
  params: { slug: entitySlug(product) },
  subject: { type: 'Product', id: product.id },
  meta: toProductPageMeta(product),
});
