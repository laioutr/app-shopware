import type { PageLocateResult } from '@laioutr-core/core-types/common';

/**
 * Shape a product `locate` result from a resolved product id and a BCP-47 locale → slug map.
 *
 * `undefined` when the product could not be resolved, so the endpoint answers `null`. Locales with an
 * empty slug are omitted, per the contract that a missing locale key means the page has no counterpart
 * there. Without `meta`, consumers fall back to the route params.
 */
export const buildProductLocate = (
  productId: string | undefined,
  slugsByLocale: Record<string, string | undefined>,
  meta?: PageLocateResult['meta']
): PageLocateResult | undefined => {
  if (!productId) return undefined;

  const locales: PageLocateResult['locales'] = {};
  for (const [locale, slug] of Object.entries(slugsByLocale)) {
    if (slug) locales[locale] = { params: { slug } };
  }

  return { subject: { type: 'Product', id: productId }, meta, locales };
};
