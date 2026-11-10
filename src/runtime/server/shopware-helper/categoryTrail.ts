import type { ShopwareCategory } from '../types/shopware';

/**
 * The ids a category's breadcrumb shows, top-down and ending with the category itself. Matches the
 * shop's own storefront: the trail starts below the first of the sales channel's entry points that
 * the category's path passes through, and is the whole path when it passes through none.
 */
export const categoryTrailIds = (category: Pick<ShopwareCategory, 'id' | 'path'>, entryPointIds: readonly string[]): string[] => {
  const ids = [...(category.path?.split('|').filter(Boolean) ?? []), category.id];

  for (const entryPointId of entryPointIds) {
    const position = ids.indexOf(entryPointId);
    if (position !== -1) return ids.slice(position + 1);
  }

  return ids;
};
