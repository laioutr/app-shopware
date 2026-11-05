import { swTranslated } from './swTranslated';
import { guessWellKnownName, normalizeOptionName } from './wellKnownOptionName';
import type { ShopwareProduct } from '../types/shopware';
import type { ProductSpecifications, WellKnownPropertyName } from '@laioutr-core/canonical-types/entity/product';
import type { EntityComponentType } from '@laioutr-core/core-types/orchestr';

type Property = NonNullable<ShopwareProduct['properties']>[number];
type SpecificationRow = NonNullable<EntityComponentType<typeof ProductSpecifications>['properties']>[number];

/**
 * Property-group names are merchant-authored, so only the terms a catalog reliably uses are matched,
 * in English and German. Colour and material come from the option-name table, which already covers
 * them in every language it lists.
 */
const PROPERTY_NAME_ALIASES: Partial<Record<WellKnownPropertyName, string[]>> = {
  weight: ['weight', 'gewicht'],
  dimensions: ['dimensions', 'dimension', 'abmessungen', 'abmessung', 'maße', 'masse'],
  width: ['width', 'breite'],
  height: ['height', 'höhe'],
  depth: ['depth', 'tiefe'],
  length: ['length', 'länge'],
  circumference: ['circumference', 'umfang'],
  diameter: ['diameter', 'durchmesser'],
  volume: ['volume', 'volumen'],
  area: ['area', 'fläche'],
  surface: ['surface', 'oberfläche'],
  warranty: ['warranty', 'guarantee', 'garantie', 'gewährleistung'],
  countryOfOrigin: ['country of origin', 'origin', 'herkunftsland', 'herkunft', 'ursprungsland'],
  careInstructions: ['care instructions', 'care', 'pflegehinweise', 'pflegehinweis', 'pflege'],
  capacity: ['capacity', 'kapazität', 'fassungsvermögen', 'inhalt'],
};

const PROPERTY_NAME_LOOKUP = new Map<string, WellKnownPropertyName>(
  Object.entries(PROPERTY_NAME_ALIASES).flatMap(([wellKnownName, aliases = []]) =>
    aliases.map((alias) => [normalizeOptionName(alias), wellKnownName as WellKnownPropertyName] as const)
  )
);

export const guessWellKnownPropertyName = (name: string): WellKnownPropertyName | undefined => {
  const property = PROPERTY_NAME_LOOKUP.get(normalizeOptionName(name));
  if (property) return property;

  const option = guessWellKnownName(name);
  return option === 'color' || option === 'material' ? option : undefined;
};

const compareNames = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Specification rows from a product's properties, one row per property group. Groups follow their
 * position, then name; a group's options follow their position where the group is sorted by
 * position and their name otherwise, which is the order Shopware's own detail page shows. A group
 * the merchant hid from the detail page stays out; Shopware versions without that flag show all.
 */
export const mapSpecifications = (properties: Property[] | null | undefined): SpecificationRow[] => {
  const groups = new Map<string, { group: NonNullable<Property['group']>; options: Property[] }>();

  for (const property of properties ?? []) {
    const group = property.group;
    if (!group?.id || group.visibleOnProductDetailPage === false) continue;
    const entry = groups.get(group.id) ?? { group, options: [] };
    entry.options.push(property);
    groups.set(group.id, entry);
  }

  return [...groups.values()]
    .map(({ group, options }) => ({
      group,
      name: swTranslated(group, 'name') ?? '',
      values: options
        .map((option) => ({ position: option.position ?? 0, name: swTranslated(option, 'name') ?? '' }))
        .filter((option) => option.name !== '')
        .sort((a, b) => (group.sortingType === 'position' ? a.position - b.position : 0) || compareNames(a.name, b.name))
        .map((option) => option.name),
    }))
    .filter(({ name, values }) => name !== '' && values.length > 0)
    .sort((a, b) => (a.group.position ?? 0) - (b.group.position ?? 0) || compareNames(a.name, b.name))
    .map(({ name, values }) => ({
      wellKnownName: guessWellKnownPropertyName(name),
      name,
      value: values.join(', '),
    }));
};
