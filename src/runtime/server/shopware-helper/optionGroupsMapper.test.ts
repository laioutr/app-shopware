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
});
