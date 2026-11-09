import { swTranslated } from './swTranslated';
import type { ShopwareProduct } from '../types/shopware';

type Setting = NonNullable<ShopwareProduct['configuratorSettings']>[number];

const sameName = (a: string | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Turn a selection named by axis and value, as `optionGroups` and a variant's `options` name it, into
 * the option and group ids Shopware's `find-variant` takes, read from the product's configurator.
 * Names compare case-insensitively, since they come back from a storefront's own rendering.
 * `undefined` when the product does not offer an axis or value of the selection.
 */
export const resolveVariantOptions = (
  configuratorSettings: Setting[],
  selection: { name: string; value: string }[],
  switchedOption?: string
): { optionIds: string[]; switchedGroupId?: string } | undefined => {
  const options = configuratorSettings.map((setting) => setting.option).filter((option) => !!option);

  const optionIds: string[] = [];
  for (const selected of selection) {
    const option = options.find(
      (candidate) =>
        sameName(swTranslated(candidate.group, 'name'), selected.name) && sameName(swTranslated(candidate, 'name'), selected.value)
    );
    if (!option) return undefined;
    optionIds.push(option.id);
  }

  const switchedGroupId =
    switchedOption === undefined ? undefined : (
      options.find((option) => sameName(swTranslated(option.group, 'name'), switchedOption))?.group?.id
    );

  return { optionIds, ...(switchedGroupId ? { switchedGroupId } : {}) };
};
