import { entitySlug } from './mappers/slugMapper';
import { swTranslated } from './swTranslated';
import type { ShopwareProduct } from '../types/shopware';
import type { PageRow } from '@laioutr-core/core-types/common';

/**
 * Map an enumerated Shopware product to a page-index {@link PageRow} for the `ProductDetailPage`
 * page-type. The `slug` comes from the product's canonical SEO URL (falling back to a sluggified
 * name); `previewImage` is the cover media's **plain** URL — deliberately not `mapMedia`, whose
 * encoded srcset can't be dereferenced by consumers outside the Nuxt image pipeline (the Cockpit
 * picker, sitemaps, indexers) that read `PageRow.meta.previewImage`.
 */
/** Shared by `query` rows and `locate` results so both describe a product page identically. */
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
