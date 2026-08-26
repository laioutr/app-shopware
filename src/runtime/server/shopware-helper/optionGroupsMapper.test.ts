import { describe, expect, it } from 'vitest';
import { mapProductOptionGroups } from './optionGroupsMapper';

const setting = (
  groupName: string,
  groupPosition: number,
  optionName: string,
  position: number,
  extra: Record<string, unknown> = {}
) => ({
  position,
  option: {
    name: optionName,
    translated: { name: optionName },
    position,
    group: { id: groupName, name: groupName, translated: { name: groupName }, position: groupPosition },
    ...extra,
  },
});

describe('mapProductOptionGroups', () => {
  it('groups settings by their option group and keeps configurator order', () => {
    const result = mapProductOptionGroups({
      configuratorSettings: [setting('Größe', 1, 'L', 2), setting('Größe', 1, 'M', 1), setting('Farbe', 0, 'Rot', 1)],
    } as never);

    expect(result.groups.map((group) => group.name)).toEqual(['Farbe', 'Größe']);
    expect(result.groups[1]!.values.map((value) => value.value)).toEqual(['M', 'L']);
  });

  it('resolves a well-known name from the group name', () => {
    const result = mapProductOptionGroups({ configuratorSettings: [setting('Farbe', 0, 'Rot', 1)] } as never);
    expect(result.groups[0]!.wellKnownName).toBe('color');
  });

  it('prefers a colour swatch over a media swatch', () => {
    const result = mapProductOptionGroups({
      configuratorSettings: [setting('Farbe', 0, 'Rot', 1, { colorHexCode: '#ff0000' })],
    } as never);
    expect(result.groups[0]!.values[0]!.swatch).toEqual(['color', '#ff0000']);
  });

  it('reports no axes for a product without a configurator', () => {
    expect(mapProductOptionGroups({} as never)).toEqual({ groups: [] });
  });

  it('drops a setting whose option was not associated', () => {
    const result = mapProductOptionGroups({ configuratorSettings: [{ position: 1 }, setting('Farbe', 0, 'Rot', 1)] } as never);
    expect(result.groups).toHaveLength(1);
  });

  // Shape taken verbatim from Shopware's public demo shop (product SW10095M), where
  // every configurator setting sits at position 0 and the option carries the order.
  // A fixture that positioned both agreed with the wrong sort and hid this.
  it('orders by the option when the configurator leaves every setting at zero', () => {
    const realShape = [
      { position: 0, option: { translated: { name: 'Refill' }, position: 8, group: { id: 'g1', translated: { name: 'Selection' }, position: 1 } } },
      { position: 0, option: { translated: { name: 'spice grinder' }, position: 1, group: { id: 'g1', translated: { name: 'Selection' }, position: 1 } } },
      { position: 0, option: { translated: { name: 'Spicejar' }, position: 2, group: { id: 'g1', translated: { name: 'Selection' }, position: 1 } } },
    ];

    const result = mapProductOptionGroups({ configuratorSettings: realShape } as never);

    expect(result.groups[0]!.values.map((value) => value.value)).toEqual(['spice grinder', 'Spicejar', 'Refill']);
  });

  it('lets an explicit setting position win over the option position', () => {
    const result = mapProductOptionGroups({
      configuratorSettings: [
        { position: 2, option: { translated: { name: 'B' }, position: 1, group: { id: 'g1', translated: { name: 'G' }, position: 0 } } },
        { position: 1, option: { translated: { name: 'A' }, position: 9, group: { id: 'g1', translated: { name: 'G' }, position: 0 } } },
      ],
    } as never);

    expect(result.groups[0]!.values.map((value) => value.value)).toEqual(['A', 'B']);
  });
});
