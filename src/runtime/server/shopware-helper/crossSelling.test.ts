import { describe, expect, it } from 'vitest';
import { mapCrossSellingElements } from './crossSelling';

const element = (crossSelling: Record<string, unknown>, products: Array<Record<string, unknown>>) =>
  ({ apiAlias: 'cross_selling_element', crossSelling, products, total: products.length }) as never;

describe('mapCrossSellingElements', () => {
  it('maps each group with its product rows, in position order', () => {
    const groups = mapCrossSellingElements([
      element({ id: 'g-accessories', name: 'Accessories', position: 2, type: 'productList', active: true }, [{ id: 'p-3' }]),
      element(
        { id: 'g-similar', name: 'Similar', translated: { name: 'Ähnliche Produkte' }, position: 1, type: 'productStream', active: true },
        [
          { id: 'v-1', parentId: 'p-1' },
          { id: 'p-2', parentId: null },
        ]
      ),
    ]);

    expect(groups).toEqual([
      {
        id: 'g-similar',
        name: 'Ähnliche Produkte',
        position: 1,
        type: 'productStream',
        products: [{ id: 'v-1', parentId: 'p-1' }, { id: 'p-2' }],
      },
      { id: 'g-accessories', name: 'Accessories', position: 2, type: 'productList', products: [{ id: 'p-3' }] },
    ]);
  });

  it('leaves out inactive groups and groups without products', () => {
    const groups = mapCrossSellingElements([
      element({ id: 'g-off', name: 'Off', position: 1, type: 'productList', active: false }, [{ id: 'p-1' }]),
      element({ id: 'g-empty', name: 'Empty', position: 2, type: 'productStream', active: true }, []),
      element({ id: 'g-on', name: 'On', position: 3, type: 'productList' }, [{ id: 'p-2' }]),
    ]);

    expect(groups.map((group) => group.id)).toEqual(['g-on']);
  });

  it('skips a malformed element or row without failing the others', () => {
    const groups = mapCrossSellingElements([
      null as never,
      element({ name: 'No id', position: 1, type: 'productList' }, [{ id: 'p-1' }]),
      element({ id: 'g-ok', name: 'Ok', position: 2, type: 'productList' }, [null as never, { name: 'no id' }, { id: 'p-2' }]),
    ]);

    expect(groups).toEqual([{ id: 'g-ok', name: 'Ok', position: 2, type: 'productList', products: [{ id: 'p-2' }] }]);
  });

  it("keeps Shopware's order for groups that share or lack a position", () => {
    const groups = mapCrossSellingElements([
      element({ id: 'g-a', name: 'A', position: 1, type: 'productList' }, [{ id: 'p-1' }]),
      element({ id: 'g-b', name: 'B', position: 1, type: 'productList' }, [{ id: 'p-2' }]),
      element({ id: 'g-c', name: 'C', type: 'productList' }, [{ id: 'p-3' }]),
    ]);

    expect(groups.map((group) => group.id)).toEqual(['g-a', 'g-b', 'g-c']);
  });

  it('answers nothing for a response that is not a list', () => {
    expect(mapCrossSellingElements(undefined)).toEqual([]);
    expect(mapCrossSellingElements({ errors: [] } as never)).toEqual([]);
  });
});
