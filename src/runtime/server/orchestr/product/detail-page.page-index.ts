import { paginate } from '#imports';
import { ProductDetailPage } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { defineShopwarePageIndex } from '../../middleware/defineShopware';
import { toProductPageEntry } from '../../shopware-helper/pageIndexEntries';
import { buildProductLocate } from '../../shopware-helper/productLocate';
import { readProductPageMeta } from '../../shopware-helper/readProductPageMeta';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

// Shopware's store API caps `limit` at MAX_LIMIT (100); a larger value is rejected with a 400.
const ENUM_PAGE_SIZE = 100;
const SEARCH_DEFAULT_TAKE = 25;

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
  cache: { ttl: '1h', search: { ttl: '5m' }, locate: { ttl: '1 day' } },
  /**
   * Point lookup, same slug→id path as `bySlug.query.ts`. The SEO resolver yields only an id, so the
   * page metadata costs a second store-API read — absorbed by `cache.locate`, and non-fatal: the
   * subject still resolves when it fails.
   *
   * `locales` carries only the current locale's slug. The store API scopes SEO reads by the
   * `sw-language-id` header, so cross-locale slugs need one read per language and are not implemented.
   */
  locate: async ({ context, params, clientEnv }) => {
    const client = context.storefrontClient;
    const seoEntry = await useSeoResolver(client).resolve('product', params.slug);
    if (!seoEntry) return undefined;

    const parentId = await useGetProductParentId(client)(seoEntry.id);
    const productId = parentId ?? seoEntry.id;

    return buildProductLocate(productId, { [clientEnv.locale]: params.slug }, await readProductPageMeta(client, productId));
  },
  count: async ({ context }) => {
    const response = await context.storefrontClient.invoke('readProduct post /product', {
      body: { ...pageIndexCriteria, limit: 1, 'total-count-mode': 'exact' },
    });
    return response.data.total ?? 0;
  },
  query: ({ context, term, take }) => {
    if (term) {
      return context.storefrontClient
        .invoke('readProduct post /product', {
          body: { ...pageIndexCriteria, term, limit: Math.min(take ?? SEARCH_DEFAULT_TAKE, ENUM_PAGE_SIZE) },
        })
        .then((response) => (response.data.elements ?? []).map(toProductPageEntry));
    }

    return paginate(async ({ cursor }) => {
      const page = cursor ? Number(cursor) : 1;
      const response = await context.storefrontClient.invoke('readProduct post /product', {
        body: { ...pageIndexCriteria, page, limit: ENUM_PAGE_SIZE },
      });
      const elements = response.data.elements ?? [];
      return {
        entries: elements.map(toProductPageEntry),
        nextCursor: elements.length < ENUM_PAGE_SIZE ? undefined : String(page + 1),
      };
    });
  },
});
