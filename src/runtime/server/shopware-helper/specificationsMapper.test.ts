import { describe, expect, it } from 'vitest';
import { guessWellKnownPropertyName, mapSpecifications } from './specificationsMapper';

const group = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  position: 1,
  sortingType: 'alphanumeric',
  visibleOnProductDetailPage: true,
  translated: { name },
  ...extra,
});

const option = (name: string, grp: ReturnType<typeof group>, position = 1) =>
  ({ id: `${grp.id}-${name}`, name, position, translated: { name }, group: grp }) as any;

describe('mapSpecifications', () => {
  it('folds the options of one group into a single row', () => {
    const material = group('m', 'Material');

    expect(mapSpecifications([option('Tritan', material), option('Plastic', material), option('Stainless steel', material)])).toEqual([
      { wellKnownName: 'material', name: 'Material', value: 'Plastic, Stainless steel, Tritan' },
    ]);
  });

  it('orders groups by position, then name', () => {
    const rows = mapSpecifications([
      option('5.2 kg', group('w', 'Weight', { position: 2 })),
      option('2.5 litres', group('c', 'Capacity', { position: 2 })),
      option('Steel', group('m', 'Material', { position: 1 })),
    ]);

    expect(rows.map((row) => row.name)).toEqual(['Material', 'Capacity', 'Weight']);
  });

  it('orders options by position when the group is sorted by position, naturally otherwise', () => {
    const byPosition = group('s', 'Size', { sortingType: 'position' });
    const alphanumeric = group('l', 'Length');

    expect(mapSpecifications([option('L', byPosition, 3), option('S', byPosition, 1), option('M', byPosition, 2)])[0].value).toBe(
      'S, M, L'
    );
    expect(mapSpecifications([option('10 cm', alphanumeric), option('9 cm', alphanumeric)])[0].value).toBe('9 cm, 10 cm');
  });

  it('prefers translated names', () => {
    const grp = { ...group('m', 'Material'), translated: { name: 'Werkstoff' } };
    const opt = { ...option('Steel', grp), translated: { name: 'Stahl' } };

    expect(mapSpecifications([opt])).toEqual([{ wellKnownName: undefined, name: 'Werkstoff', value: 'Stahl' }]);
  });

  it('leaves out groups hidden from the detail page, and keeps them where the flag is missing', () => {
    expect(mapSpecifications([option('x', group('h', 'Internal', { visibleOnProductDetailPage: false }))])).toEqual([]);
    expect(mapSpecifications([option('x', group('o', 'Older', { visibleOnProductDetailPage: undefined }))])).toHaveLength(1);
  });

  it('returns no rows for a product without properties', () => {
    expect(mapSpecifications(undefined)).toEqual([]);
    expect(mapSpecifications(null)).toEqual([]);
    expect(mapSpecifications([{ id: 'orphan', name: 'x' } as any])).toEqual([]);
  });
});

describe('guessWellKnownPropertyName', () => {
  it('maps English and German group names', () => {
    expect(guessWellKnownPropertyName('Weight')).toBe('weight');
    expect(guessWellKnownPropertyName('Gewicht')).toBe('weight');
    expect(guessWellKnownPropertyName('Maße')).toBe('dimensions');
    expect(guessWellKnownPropertyName('Höhe')).toBe('height');
    expect(guessWellKnownPropertyName('Herkunftsland')).toBe('countryOfOrigin');
  });

  it('takes colour and material from the option-name table', () => {
    expect(guessWellKnownPropertyName('Farbe')).toBe('color');
    expect(guessWellKnownPropertyName('Matière')).toBe('material');
  });

  it('leaves option axes that are no property name unmatched', () => {
    expect(guessWellKnownPropertyName('Size')).toBeUndefined();
    expect(guessWellKnownPropertyName('Polsterung')).toBeUndefined();
  });
});
