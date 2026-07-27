import type { PageLocateResult } from '@laioutr-core/core-types/common';

/**
 * Shape a product `locate` result from a resolved product id and a BCP-47 locale → slug map.
 *
 * Returns `undefined` when the product could not be resolved (→ the endpoint answers `null` and
 * consumers degrade to status quo). Locales with an empty slug are omitted, per the contract that a
 * missing locale key means the page has no counterpart there.
 *
 * `meta` carries the product's metadata in the requested locale — the same vocabulary the enumerated
 * `PageRow.meta` uses — so the Studio selector can label the located page with its name instead of
 * its slug. Omit it and consumers fall back to the route params.
 *
 * Kept pure (no platform client) so the assembly is unit-testable without the orchestr arg envelope.
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
