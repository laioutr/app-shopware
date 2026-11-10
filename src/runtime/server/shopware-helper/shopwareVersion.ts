import { consola } from 'consola';

const logger = consola.withTag('shopware/version');

/** A Shopware release as its four numeric parts: `6.6.10.27` is `[6, 6, 10, 27]`. */
export type ShopwareVersion = readonly [number, number, number, number];

export const parseShopwareVersion = (raw: unknown): ShopwareVersion | undefined => {
  if (typeof raw !== 'string') return undefined;
  const parts = /^v?(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(raw.trim());
  return parts ? [Number(parts[1]), Number(parts[2]), Number(parts[3]), Number(parts[4])] : undefined;
};

export const formatShopwareVersion = (version: ShopwareVersion | undefined): string => version?.join('.') ?? 'unknown';

/** Whether `version` is `minimum` or a later release. An unknown version is neither. */
export const isAtLeast = (version: ShopwareVersion | undefined, minimum: `${number}.${number}.${number}.${number}`): boolean => {
  if (!version) return false;
  const floor = parseShopwareVersion(minimum)!;
  for (let i = 0; i < 4; i++) {
    if (version[i] !== floor[i]) return version[i]! > floor[i]!;
  }
  return true;
};

/** Whether the shop serves the `/breadcrumb/{id}` Store API route, which 6.6.7 added. An unknown version is taken to. */
export const hasBreadcrumbRoute = (version: ShopwareVersion | undefined): boolean => !version || isAtLeast(version, '6.6.7.0');

/**
 * The Store API route a product search reads.
 *
 * From 6.6.10 until 6.7.3, `/search` drops the requested limit and pages by the shop's
 * products-per-page setting, while `/search-suggest` keeps it. Outside that range `/search` keeps the
 * limit, and the alternative is wrong in another way: 6.5 caches suggest results without the page and
 * the built-in filters, and 6.7.3 and later page suggest results by their own limit. An unknown
 * version reads `/search`.
 */
export const productSearchRoute = (version: ShopwareVersion | undefined): 'search' | 'suggest' =>
  isAtLeast(version, '6.6.10.0') && !isAtLeast(version, '6.7.3.0') ? 'suggest' : 'search';

/**
 * The paging parameters of a product listing or search body.
 *
 * 6.5 pages only by `p` and overwrites the offset a criteria `page` sets. 6.7 honours `page`, and
 * answers a `p` past the last page with 404 `PRODUCT__LISTING_PAGE_OUT_OF_RANGE` where a `page` past
 * it reads as an empty page. Below 6.7, or with the version unknown, both are sent and `p` wins.
 */
export const listingPageParams = (version: ShopwareVersion | undefined, page: number): { page: number; p?: number } =>
  isAtLeast(version, '6.7.0.0') ? { page } : { page, p: page };

const warnedIgnoredLimits = new Set<string>();

/**
 * Log, once per route and release, a read that Shopware paged by a different limit than it was asked
 * for. That is the sign of a release whose paging the version rules above do not describe; a limit
 * above the shop's `maxLimit` is capped on purpose and does not count.
 */
export const warnOnIgnoredLimit = (
  route: string,
  version: ShopwareVersion | undefined,
  { requested, effective, maxLimit }: { requested: number; effective: number | undefined; maxLimit: number }
): boolean => {
  if (effective === undefined || effective === requested || requested > maxLimit) return false;

  const key = `${route}@${formatShopwareVersion(version)}`;
  if (!warnedIgnoredLimits.has(key)) {
    warnedIgnoredLimits.add(key);
    logger.warn(`${route} paged by ${effective} instead of the requested ${requested} on Shopware ${formatShopwareVersion(version)}`);
  }
  return true;
};
