import { ShopwareCategory } from '../types/shopware';

/** Returns a flat list of shopware categories
 *
 */
export const flattenCategories = (categories: ShopwareCategory[], parent?: ShopwareCategory) => {
  const flattenedCategories: ShopwareCategory[] = [];
  for (const category of categories) {
    // Replace shopwares original parentId with the parentId of the parent category. This makes sure that if this is a root-category, the parentId is undefined
    category.parentId = parent?.id;

    flattenedCategories.push(category);
    if (category.children) {
      flattenedCategories.push(...flattenCategories(category.children, category));
    }
  }
  return flattenedCategories;
};
