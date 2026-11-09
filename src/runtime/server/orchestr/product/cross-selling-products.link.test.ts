import { beforeEach, describe, expect, it, vi } from 'vitest';
import crossSellingProducts from './cross-selling-products.link';
import { cacheProductParentIds } from '../../composable/useGetProductParentId';
import { readCrossSellings } from '../../shopware-helper/readCrossSellings';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ parentIdToDefaultVariantIdToken: 'defaultVariants' }));
vi.mock('../../composable/useGetProductParentId', () => ({ cacheProductParentIds: vi.fn() }));
vi.mock('../../shopware-helper/readCrossSellings', () => ({ readCrossSellings: vi.fn() }));

type Run = (args: Record<string, unknown>) => Promise<{ links: Array<Record<string, unknown>> }>;
const run = (crossSellingProducts as unknown as { run: Run }).run;

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const page = (limit = 24, offset = 0) => ({ limit, offset, page: Math.floor(offset / limit) + 1 });

const groups = [
  {
    id: 'g-similar',
    name: 'Similar',
    position: 1,
    type: 'productStream',
    products: [{ id: 'v-7', parentId: 'p-7' }, { id: 'p-8' }, { id: 'v-1c', parentId: 'p-1' }],
  },
  { id: 'g-accessories', name: 'Accessories', position: 2, type: 'productList', products: [{ id: 'p-8' }, { id: 'p-9' }] },
];

beforeEach(() => {
  vi.mocked(readCrossSellings).mockReset();
  vi.mocked(cacheProductParentIds).mockReset();
});

describe('ShopwareProductCrossSellingProductsLink', () => {
  it('links the products of all groups in group order, each once and without the product itself', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['v-1b', groups]]));
    const passthrough = passthroughOf({ defaultVariants: { 'p-1': 'v-1b' } });

    const result = await run({ entityIds: ['p-1'], context: { storefrontClient: {} }, passthrough, pagination: page() });

    expect(result.links).toEqual([{ sourceId: 'p-1', targetIds: ['p-7', 'p-8', 'p-9'], entityTotal: 3 }]);
  });

  it('has the product resolver show the variant Shopware answered, keeping what the request chose before', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['v-1b', groups]]));
    const passthrough = passthroughOf({ defaultVariants: { 'p-1': 'v-1b' } });

    await run({ entityIds: ['p-1'], context: { storefrontClient: {} }, passthrough, pagination: page() });

    expect(passthrough.get('defaultVariants')).toEqual({ 'p-1': 'v-1b', 'p-7': 'v-7', 'p-8': 'p-8', 'p-9': 'p-9' });
    expect(cacheProductParentIds).toHaveBeenCalledWith([
      ['v-7', 'p-7'],
      ['p-8', undefined],
      ['p-9', undefined],
    ]);
  });

  it('pages the list and reports its full length', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-1', groups]]));

    const result = await run({
      entityIds: ['p-1'],
      context: { storefrontClient: {} },
      passthrough: passthroughOf(),
      pagination: page(2, 2),
    });

    expect(result.links).toEqual([{ sourceId: 'p-1', targetIds: ['p-9'], entityTotal: 3 }]);
  });

  it('links nothing for a product whose read failed', async () => {
    vi.mocked(readCrossSellings).mockResolvedValue(new Map([['p-2', groups]]));

    const result = await run({
      entityIds: ['p-1', 'p-2'],
      context: { storefrontClient: {} },
      passthrough: passthroughOf(),
      pagination: page(),
    });

    expect(result.links.map((link) => link.sourceId)).toEqual(['p-2']);
  });
});
