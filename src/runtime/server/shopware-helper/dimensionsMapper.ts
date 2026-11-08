import type { ShopwareProduct } from '../types/shopware';
import type { ProductSpecifications, WellKnownPropertyName } from '@laioutr-core/canonical-types/entity/product';
import type { EntityComponentType } from '@laioutr-core/core-types/orchestr';

type SpecificationRow = NonNullable<EntityComponentType<typeof ProductSpecifications>['properties']>[number];

/** The unit a shop enters width, height and length in. */
export type DimensionUnit = 'mm' | 'cm';

const DIMENSIONS = ['weight', 'width', 'height', 'length'] as const satisfies readonly WellKnownPropertyName[];

// Shopware's own storefront labels these fields in the shop's language, so the rows need a name; others read English.
const NAMES: Record<'de' | 'en', Record<(typeof DIMENSIONS)[number], string>> = {
  de: { weight: 'Gewicht', width: 'Breite', height: 'Höhe', length: 'Länge' },
  en: { weight: 'Weight', width: 'Width', height: 'Height', length: 'Length' },
};

/**
 * Specification rows from Shopware's native weight, width, height and length, in the order Shopware's storefront
 * lists them. Weight is in kilograms; the measures in `unit`, which Shopware's admin labels millimetres. A field
 * that is unset, zero or no number makes no row.
 */
export const mapDimensions = (product: ShopwareProduct | undefined, options: { unit: DimensionUnit; languageCode: string }): SpecificationRow[] => {
  if (!product) return [];
  const names = options.languageCode.toLowerCase().startsWith('de') ? NAMES.de : NAMES.en;
  return DIMENSIONS.flatMap((name) => {
    const value = product[name];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return [];
    return [{ wellKnownName: name, name: names[name], value: { value, unit: name === 'weight' ? 'kg' : options.unit } }];
  });
};
