import { describe, expect, it } from 'vitest';
import { resolveVariantOptions } from './variantOptions';

const option = (id: string, name: string, groupId: string, groupName: string) => ({
  option: { id, name, translated: { name }, group: { id: groupId, name: groupName, translated: { name: groupName } } },
});

const settings = [
  option('opt-red', 'Red', 'grp-color', 'Color'),
  option('opt-blue', 'Blue', 'grp-color', 'Color'),
  option('opt-m', 'M', 'grp-size', 'Size'),
  option('opt-l', 'L', 'grp-size', 'Size'),
] as never[];

describe('resolveVariantOptions', () => {
  it('turns axis and value names into option ids, matching case-insensitively', () => {
    expect(
      resolveVariantOptions(settings, [
        { name: 'color', value: 'BLUE' },
        { name: 'Size', value: 'M' },
      ])
    ).toEqual({ optionIds: ['opt-blue', 'opt-m'] });
  });

  it('names the switched axis by its group id', () => {
    expect(resolveVariantOptions(settings, [{ name: 'Size', value: 'L' }], 'Size')).toEqual({
      optionIds: ['opt-l'],
      switchedGroupId: 'grp-size',
    });
  });

  it('answers undefined for a value the product does not offer', () => {
    expect(resolveVariantOptions(settings, [{ name: 'Color', value: 'Green' }])).toBeUndefined();
  });

  it('drops a switched axis the product does not have', () => {
    expect(resolveVariantOptions(settings, [{ name: 'Color', value: 'Red' }], 'Material')).toEqual({ optionIds: ['opt-red'] });
  });
});
