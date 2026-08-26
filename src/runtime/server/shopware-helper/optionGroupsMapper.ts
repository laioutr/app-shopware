import { mapMedia } from './mediaMapper';
import { swTranslated } from './swTranslated';
import { guessWellKnownName } from './wellKnownOptionName';
import type { ShopwareProduct } from '../types/shopware';
import type { Swatch } from '@laioutr-core/core-types/common';

type Setting = NonNullable<ShopwareProduct['configuratorSettings']>[number];
type Option = NonNullable<Setting['option']>;

const byPosition = (a: { position?: number | null }, b: { position?: number | null }) => (a.position ?? 0) - (b.position ?? 0);

const mapSwatch = (option: Option): Swatch | undefined => {
  const hex = swTranslated(option, 'colorHexCode') ?? option.colorHexCode;
  if (hex) return ['color', hex];

  const media = option.media ? mapMedia(option.media) : undefined;
  return media?.type === 'image' ? ['image', media] : undefined;
};

/**
 * The option axes a product offers, read from its configurator.
 *
 * The configurator is what defines a variant; `properties` on the same product are
 * filterable facets and never do. Only the parent carries it, so this must be given
 * the parent row rather than the variant the rest of the projection reads from.
 *
 * Per-value stock and a per-value variant id are deliberately absent: both would
 * mean loading every child variant, which is the cost this component exists to
 * avoid. A consumer that needs them falls back to the variants link.
 */
export const mapProductOptionGroups = (product: Pick<ShopwareProduct, 'configuratorSettings'>) => {
  const settings = (product.configuratorSettings ?? []).filter((setting): setting is Setting & { option: Option } => !!setting.option);

  const groups = new Map<string, { name: string; position: number; settings: (Setting & { option: Option })[] }>();
  for (const setting of settings) {
    const group = setting.option.group;
    const key = group?.id ?? swTranslated(group, 'name') ?? '';
    const existing = groups.get(key);
    if (existing) {
      existing.settings.push(setting);
      continue;
    }
    groups.set(key, { name: swTranslated(group, 'name') ?? '', position: group?.position ?? 0, settings: [setting] });
  }

  return {
    groups: [...groups.values()].sort(byPosition).map((group) => ({
      name: group.name,
      wellKnownName: guessWellKnownName(group.name),
      // The merchant's configurator order, which is what keeps a size run out of
      // alphabetical order.
      values: [...group.settings].sort(byPosition).map((setting) => ({
        value: swTranslated(setting.option, 'name') ?? '',
        swatch: mapSwatch(setting.option),
      })),
    })),
  };
};
