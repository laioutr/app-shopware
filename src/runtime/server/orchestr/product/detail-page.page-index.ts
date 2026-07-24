import { paginate } from '#imports';
import { ProductDetailPage } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwarePageIndex } from '../../middleware/defineShopware';
import { toProductPageRow } from '../../shopware-helper/pageIndexRows';

const ENUM_PAGE_SIZE = 250;
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
  cache: { ttl: '1h', search: { ttl: '5m' } },
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
