import type { ShopwareCategory } from '../types/shopware';
import type { CategoryRoots } from './system/getCategoryRoots';

/**
 * The ids a category's breadcrumb shows, top-down and ending with the category itself. Matches the
 * shop's own storefront: the trail starts below the first of the navigation, service and footer roots
 * that the category's path passes through, and is the whole path when it passes through none.
 */
export const categoryTrailIds = (category: Pick<ShopwareCategory, 'id' | 'path'>, roots: CategoryRoots | undefined): string[] => {
  const ids = [...(category.path?.split('|').filter(Boolean) ?? []), category.id];

  for (const rootId of [roots?.navigation, roots?.service, roots?.footer]) {
    const position = rootId ? ids.indexOf(rootId) : -1;
    if (position !== -1) return ids.slice(position + 1);
  }

  return ids;
};
