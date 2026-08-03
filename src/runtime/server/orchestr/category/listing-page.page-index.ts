import { paginate } from '#imports';
import { ProductListingPage } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwarePageIndex } from '../../middleware/defineShopware';
import { toCategoryPageEntry } from '../../shopware-helper/pageIndexEntries';
import { readCategoryPageMeta } from '../../shopware-helper/readCategoryPageMeta';
import { SHOPWARE_MAX_LIMIT, storeApiPageFetcher } from '../../shopware-helper/storeApiPageFetcher';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

/**
 * The categories the storefront serves as listing pages. The store API applies none of this itself:
 * unfiltered, most rows are inactive, and level-1 rows are navigation roots the storefront renders as
 * the home page and the footer menu. `visible` is deliberately not filtered — a category hidden from
 * navigation still renders.
 */
const membershipFilter = [
  { type: 'equals' as const, field: 'type', value: 'page' },
  { type: 'equals' as const, field: 'active', value: true },
  { type: 'range' as const, field: 'level', parameters: { gt: 1 } },
];

const pageIndexCriteria = {
  associations: { seoUrls: {}, media: {} },
  includes: {
    category: ['id', 'name', 'translated', 'updatedAt', 'seoUrls', 'media'],
    seo_url: ['seoPathInfo', 'isCanonical', 'routeName'],
    media: ['url'],
  },
  filter: membershipFilter,
  // Page-number cursors need a stable upstream order, or a resumed walk shifts entries between passes.
  sort: [{ field: 'id', order: 'ASC' as const }],
};

export default defineShopwarePageIndex({
  for: ProductListingPage,
  label: 'Shopware Category',
  batchSize: SHOPWARE_MAX_LIMIT,
  cache: { ttl: '1h', search: { ttl: '5m' }, locate: { ttl: '1 day' } },
  /**
   * Point lookup down the same slug→id path as `bySlug.query.ts`, so the index and the rendered page
   * always agree on which category a URL means. The resolver yields only an id, so the page metadata
   * costs a second store-API read — absorbed by `cache.locate`, and non-fatal: the subject still
   * resolves when it fails.
   *
   * `locales` is left unset: the store API scopes SEO reads by the `sw-language-id` header, so
   * cross-locale slugs need one read per language and are not implemented. Reporting only the current
   * locale would claim the category has no page in any other.
   */
  locate: async ({ context, params }) => {
    const seoEntry = await useSeoResolver(context.storefrontClient).resolve('category', params.slug);
    if (!seoEntry) return undefined;

    return {
      subject: { type: 'Category', id: seoEntry.id },
      meta: await readCategoryPageMeta(context.storefrontClient, seoEntry.id),
    };
  },
  count: async ({ context }) => {
    const response = await context.storefrontClient.invoke('readCategoryList post /category', {
      body: { ...pageIndexCriteria, limit: 1, 'total-count-mode': 'exact' },
    });
    return response.data.total ?? 0;
  },
  /** Substring match on name and metaTitle, the same form the query-template picker uses for categories. */
  search: ({ context, term, take }) =>
    context.storefrontClient
      .invoke('readCategoryList post /category', {
        body: {
          ...pageIndexCriteria,
          filter: [
            ...membershipFilter,
            {
              type: 'multi' as const,
              operator: 'or' as const,
              queries: [
                { type: 'contains' as const, field: 'name', value: term },
                { type: 'contains' as const, field: 'metaTitle', value: term },
              ],
            },
          ],
          limit: take,
        },
      })
      .then((response) => (response.data.elements ?? []).map(toCategoryPageEntry)),
  list: ({ context, batchSize, startCursor }) =>
    paginate(
      storeApiPageFetcher(
        ({ page, limit }) =>
          context.storefrontClient
            .invoke('readCategoryList post /category', { body: { ...pageIndexCriteria, page, limit } })
            .then((response) => response.data),
        toCategoryPageEntry,
        batchSize
      ),
      startCursor
    ),
});
