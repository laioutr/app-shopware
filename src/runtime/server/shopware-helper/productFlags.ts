import type { ShopwareProduct } from '../types/shopware';
import type { ProductFlags } from '@laioutr-core/canonical-types/entity/product';
import type { EntityComponentType } from '@laioutr-core/core-types/orchestr';

type ProductFlag = EntityComponentType<typeof ProductFlags>['flags'][number];

/**
 * Marketing flags Shopware itself carries on a product. `markAsTopseller` is inherited, so a variant
 * reports `null` where the parent decides; `isNew` is computed per row from its release date and the
 * shop's "mark as new" window. A frontend translates and styles the well-known code; `name` is only
 * what it shows where it does not know the code.
 */
export const deriveProductFlags = (rawProduct: ShopwareProduct, rawVariant: ShopwareProduct): ProductFlag[] => {
  const flags: ProductFlag[] = [];

  if (rawVariant.isNew ?? rawProduct.isNew) flags.push({ wellKnownName: 'new', name: 'New' });
  if (rawVariant.markAsTopseller ?? rawProduct.markAsTopseller) flags.push({ wellKnownName: 'bestseller', name: 'Bestseller' });

  return flags;
};
