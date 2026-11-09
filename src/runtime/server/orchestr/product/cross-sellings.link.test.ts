import { beforeEach, describe, expect, it, vi } from 'vitest';
import crossSellings from './cross-sellings.link';
import { readCrossSellings } from '../../shopware-helper/readCrossSellings';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ parentIdToDefaultVariantIdToken: 'defaultVariants', crossSellingGroupsToken: 'groups' }));
vi.mock('../../composable/useGetProductParentId', () => ({ cacheProductParentIds: vi.fn() }));
vi.mock('../../shopware-helper/readCrossSellings', () => ({ readCrossSellings: vi.fn() }));

type Run = (args: Record<string, unknown>) => Promise<{ links: Array<Record<string, unknown>> }>;
const run = (crossSellings as unknown as { run: Run }).run;

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const similar = { id: 'g-similar', name: 'Similar', position: 1, type: 'productStream', products: [{ id: 'v-7', parentId: 'p-7' }] };
const accessories = { id: 'g-accessories', name: 'Accessories', position: 2, type: 'productList', products: [{ id: 'p-8' }] };

beforeEach(() => vi.mocked(readCrossSellings).mockReset());

describe('ShopwareProductCrossSellingsLink', () => {
  it("answers each product's groups inline, in the order Shopware gave them", async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-1', [similar, accessories]]]));

    const result = await run({
      entityIds: ['p-1'],
      context: { storefrontClient: {} },
      passthrough: passthroughOf(),
      $entity: (entity: unknown) => entity,
    });

    expect(result.links).toEqual([
      {
        sourceId: 'p-1',
        entities: [
          { id: 'g-similar', base: { name: 'Similar', position: 1, type: 'productStream' } },
          { id: 'g-accessories', base: { name: 'Accessories', position: 2, type: 'productList' } },
        ],
        entityTotal: 2,
      },
    ]);
  });

  it('asks Shopware for the variant the request shows, and links the answer to the product', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['v-1b', [similar]]]));
    const passthrough = passthroughOf({ defaultVariants: { 'p-1': 'v-1b' } });

    const result = await run({ entityIds: ['p-1'], context: { storefrontClient: {} }, passthrough, $entity: (entity: unknown) => entity });

    expect(readCrossSellings).toHaveBeenCalledWith({}, ['v-1b']);
    expect(result.links[0]!.sourceId).toBe('p-1');
  });

  it('leaves the rows of every group for the products link nested under it', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-1', [similar, accessories]]]));
    const passthrough = passthroughOf();

    await run({ entityIds: ['p-1'], context: { storefrontClient: {} }, passthrough, $entity: (entity: unknown) => entity });

    expect(passthrough.get('groups')).toEqual({
      'g-similar': { productIds: ['p-1', 'p-1'], products: similar.products },
      'g-accessories': { productIds: ['p-1', 'p-1'], products: accessories.products },
    });
  });

  it('links nothing for a product whose read failed, and an empty list for one without groups', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-2', []]]));

    const result = await run({
      entityIds: ['p-1', 'p-2'],
      context: { storefrontClient: {} },
      passthrough: passthroughOf(),
      $entity: (entity: unknown) => entity,
    });

    expect(result.links).toEqual([{ sourceId: 'p-2', entities: [], entityTotal: 0 }]);
  });

  it('pages the groups when the request asks for a page', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-1', [similar, accessories]]]));

    const result = await run({
      entityIds: ['p-1'],
      context: { storefrontClient: {} },
      passthrough: passthroughOf(),
      pagination: { offset: 1, limit: 1, page: 2 },
      $entity: (entity: unknown) => entity,
    });

    expect(result.links[0]).toEqual(
      expect.objectContaining({ entities: [expect.objectContaining({ id: 'g-accessories' })], entityTotal: 2 })
    );
  });
});
