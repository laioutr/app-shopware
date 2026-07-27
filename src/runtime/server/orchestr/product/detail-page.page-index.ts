import { paginate } from '#imports';
import { ProductDetailPage } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { defineShopwarePageIndex } from '../../middleware/defineShopware';
import { toProductPageRow } from '../../shopware-helper/pageIndexRows';
import { buildProductLocate } from '../../shopware-helper/productLocate';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

// Shopware's store API caps `limit` at MAX_LIMIT (100); a larger value is rejected with a 400.
const ENUM_PAGE_SIZE = 100;
const SEARCH_DEFAULT_TAKE = 25;

/** Include only the fields a page-index row needs, plus the associations that carry the slug and cover. */
const pageIndexCriteria = {
  associations: { seoUrls: {}, cover: {} },
  includes: {
    product: ['id', 'name', 'translated', 'updatedAt', 'seoUrls', 'cover'],
    seo_url: ['seoPathInfo', 'isCanonical', 'routeName'],
    product_media: ['media'],
    media: ['url'],
  },
  // Parents only: variants collapse into their parent, matching one detail page per product
  // (the `bySlug` resolver also works off parent ids).
  filter: [{ type: 'equals' as const, field: 'parentId', value: null }],
};

/**
 * Enumerate concrete `ProductDetailPage` instances from Shopware's `/product` store-API. One request
 * per page returns fully-formed products (slug via canonical SEO URL, translated name, cover image),
 * so no per-row enrichment fetch is needed. Search mode delegates term matching to the store-API.
 */
export default defineShopwarePageIndex({
  for: ProductDetailPage,
  label: 'Shopware Product',
  cache: { ttl: '1h', search: { ttl: '5m' }, locate: { ttl: '1 day' } },
  /**
   * Point lookup: resolve the subject the current URL shows (same slug→id path as `bySlug.query.ts`).
   *
   * `locales` carries the current locale's slug (taken from the URL). Full cross-locale slugs — which
   * also complete the SEO hreflang alternates — are a follow-up: the store API scopes SEO reads by the
   * `sw-language-id` header, so per-language slugs need live-store-verified per-language reads. See
   * docs/plans/2026-07-24-page-locate-current-subject-design.md.
   */
  locate: async ({ context, params, clientEnv }) => {
    const client = context.storefrontClient;
    const seoEntry = await useSeoResolver(client).resolve('product', params.slug);
    if (!seoEntry) return undefined;

    const parentId = await useGetProductParentId(client)(seoEntry.id);
    const productId = parentId ?? seoEntry.id;

    return buildProductLocate(productId, { [clientEnv.locale]: params.slug });
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
        .then((response) => (response.data.elements ?? []).map(toProductPageRow));
    }

    return paginate(async ({ cursor }) => {
      const page = cursor ? Number(cursor) : 1;
      const response = await context.storefrontClient.invoke('readProduct post /product', {
        body: { ...pageIndexCriteria, page, limit: ENUM_PAGE_SIZE },
      });
      const elements = response.data.elements ?? [];
      return {
        rows: elements.map(toProductPageRow),
        nextCursor: elements.length < ENUM_PAGE_SIZE ? undefined : String(page + 1),
      };
    });
  },
});
