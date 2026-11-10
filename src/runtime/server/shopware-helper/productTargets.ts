/** A product row Shopware answered with: a variant carries the product it belongs to. */
export interface ProductRow {
  id: string;
  parentId?: string;
}

/**
 * The products to link, keyed the way this app keys a `Product`: by the parent of a variant row. Each
 * product appears once, at its first row. `defaultVariantIds` names the row Shopware answered, so the
 * product resolver shows that variant rather than the parent.
 */
export const productTargetsOf = (rows: ProductRow[]) => {
  const targetIds: string[] = [];
  const defaultVariantIds: Record<string, string> = {};

  for (const row of rows) {
    const productId = row.parentId ?? row.id;
    if (productId in defaultVariantIds) continue;
    targetIds.push(productId);
    defaultVariantIds[productId] = row.id;
  }

  return { targetIds, defaultVariantIds };
};
