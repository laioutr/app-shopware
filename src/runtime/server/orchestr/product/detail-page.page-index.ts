import { paginate } from '#imports';
import { ProductDetailPage } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { defineShopwarePageIndex } from '../../middleware/defineShopware';
import { toProductPageEntry } from '../../shopware-helper/pageIndexEntries';
import { buildProductLocate } from '../../shopware-helper/productLocate';
import { readProductPageMeta } from '../../shopware-helper/readProductPageMeta';
import { SHOPWARE_MAX_LIMIT, storeApiPageFetcher } from '../../shopware-helper/storeApiPageFetcher';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

const pageIndexCriteria = {
  associations: { seoUrls: {}, cover: {} },
  includes: {
    product: ['id', 'name', 'translated', 'updatedAt', 'seoUrls', 'cover'],
    seo_url: ['seoPathInfo', 'isCanonical', 'routeName'],
    product_media: ['media'],
    media: ['url'],
  },
  // Variants collapse into their parent — one detail page per product, matching `bySlug`'s parent ids.
  filter: [{ type: 'equals' as const, field: 'parentId', value: null }],
};

/** `/product` returns fully-formed products (canonical SEO slug, translated name, cover), so entries need no per-entry enrichment fetch. */
export default defineShopwarePageIndex({
  for: ProductDetailPage,
  label: 'Shopware Product',
  batchSize: SHOPWARE_MAX_LIMIT,
  cache: { ttl: '1h', search: { ttl: '5m' }, locate: { ttl: '1 day' } },
  /**
   * Point lookup, same slug→id path as `bySlug.query.ts`. The SEO resolver yields only an id, so the
   * page metadata costs a second store-API read — absorbed by `cache.locate`, and non-fatal: the
   * subject still resolves when it fails.
   *
   * `locales` is left unset: the store API scopes SEO reads by the `sw-language-id` header, so
   * cross-locale slugs need one read per language and are not implemented. Reporting only the current
   * locale would claim the product has no page in any other.
   */
  locate: async ({ context, params }) => {
    const client = context.storefrontClient;
    const seoEntry = await useSeoResolver(client).resolve('product', params.slug);
    if (!seoEntry) return undefined;

    const parentId = await useGetProductParentId(client)(seoEntry.id);
    const productId = parentId ?? seoEntry.id;

    return buildProductLocate(productId, await readProductPageMeta(client, productId));
  },
  count: async ({ context }) => {
    const response = await context.storefrontClient.invoke('readProduct post /product', {
      body: { ...pageIndexCriteria, limit: 1, 'total-count-mode': 'exact' },
    });
    return response.data.total ?? 0;
  },
  search: ({ context, term, take }) =>
    context.storefrontClient
      .invoke('readProduct post /product', { body: { ...pageIndexCriteria, term, limit: take } })
      .then((response) => (response.data.elements ?? []).map(toProductPageEntry)),
  list: ({ context, batchSize, startCursor }) =>
    paginate(
      storeApiPageFetcher(
        ({ page, limit }) =>
          context.storefrontClient
            .invoke('readProduct post /product', { body: { ...pageIndexCriteria, page, limit } })
            .then((response) => response.data),
        toProductPageEntry,
        batchSize
      ),
      startCursor
    ),
});
