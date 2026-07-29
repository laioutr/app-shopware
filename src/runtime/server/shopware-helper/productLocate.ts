import type { PageIndexLocateResult } from '@laioutr-core/core-types/orchestr';

/**
 * Shape a product `locate` result from a resolved product id.
 *
 * `undefined` when the product could not be resolved, so the endpoint answers `null`. Without `meta`,
 * consumers fall back to the route params.
 *
 * Pass `slugsByLocale` — a BCP-47 locale → slug map — only when every one of the project's locales
 * was looked up. A missing key asserts the product has no page in that locale, which drops its
 * hreflang alternate and sends the locale switcher to the homepage; omit the argument entirely while
 * only the current locale is resolved, so consumers treat the rest as unknown. Locales with an empty
 * slug are dropped from a map that is passed.
 */
export const buildProductLocate = (
  productId: string | undefined,
  meta?: PageIndexLocateResult['meta'],
  slugsByLocale?: Record<string, string | undefined>
): PageIndexLocateResult | undefined => {
  if (!productId) return undefined;
  if (!slugsByLocale) return { subject: { type: 'Product', id: productId }, meta };

  const locales: PageIndexLocateResult['locales'] = {};
  for (const [locale, slug] of Object.entries(slugsByLocale)) {
    if (slug) locales[locale] = { params: { slug } };
  }

  return { subject: { type: 'Product', id: productId }, meta, locales };
};
