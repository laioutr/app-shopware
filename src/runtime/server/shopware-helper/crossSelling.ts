import { swTranslated } from './swTranslated';
import type { ProductRow } from './productTargets';
import type { Schemas } from '../types/storeApiTypes';

export interface CrossSellingGroup {
  id: string;
  name: string;
  position: number;
  type: string;
  products: ProductRow[];
}

/**
 * The groups worth showing, in Shopware's position order: an inactive group, one with no products and a
 * malformed element are left out, so one bad group costs only itself.
 */
export const mapCrossSellingElements = (elements: Schemas['CrossSellingElement'][] | null | undefined): CrossSellingGroup[] => {
  if (!Array.isArray(elements)) return [];

  return elements
    .flatMap((element, index) => {
      const crossSelling = element?.crossSelling;
      if (!crossSelling?.id || crossSelling.active === false) return [];

      const products = (Array.isArray(element.products) ? element.products : [])
        .filter((product) => typeof product?.id === 'string')
        .map((product) => ({ id: product.id, ...(product.parentId ? { parentId: product.parentId } : {}) }));
      if (products.length === 0) return [];

      const position = Number(crossSelling.position);
      return [
        {
          index,
          group: {
            id: crossSelling.id,
            name: swTranslated(crossSelling, 'name') ?? '',
            // Shopware answers sorted; a missing position keeps the group where Shopware put it.
            position: Number.isFinite(position) ? position : index,
            type: crossSelling.type ?? '',
            products,
          },
        },
      ];
    })
    .sort((a, b) => a.group.position - b.group.position || a.index - b.index)
    .map(({ group }) => group);
};
