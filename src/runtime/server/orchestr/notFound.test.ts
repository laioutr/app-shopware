import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartGetCurrent from './cart/get-current.query';
import categoryResolver from './category/base.resolver';
import categoryBySlug from './category/bySlug.query';
import productResolver from './product/base.resolver';
import productsByCategorySlug from './product/byCategorySlug.query';
import productBySlug from './product/bySlug.query';
import { fetchAllProducts } from '../shopware-helper/fetchAllProductVariants';
import { getCart } from '../shopware-helper/getCart';

// The handlers reach Nuxt's auto-imports through these modules, which a plain node run cannot resolve.
vi.mock('../middleware/defineShopware', () => ({
  defineShopwareQuery: (tokenOrHandler: { run?: unknown }, run?: unknown) => run ?? tokenOrHandler.run,
  defineShopwareComponentResolver: (resolver: unknown) => resolver,
}));
vi.mock('../const/passthroughTokens', () => ({
  categoriesToken: 'categories',
  cartFragmentToken: 'cart',
  currentProductIdsToken: 'currentProductIds',
  parentIdToDefaultVariantIdToken: 'parentIdToDefaultVariantId',
  productVariantsToken: 'productVariants',
}));
vi.mock('../shopware-helper/useSeoResolver', () => ({ useSeoResolver: () => ({ resolve: async () => null }) }));
vi.mock('../composable/useGetProductParentId', () => ({
  useGetProductParentId: () => async () => undefined,
  cacheProductParentIds: () => {},
}));
vi.mock('../shopware-helper/fetchAllProductVariants', () => ({ fetchAllProducts: vi.fn() }));
vi.mock('../shopware-helper/getCart', () => ({ getCart: vi.fn() }));
vi.mock('../shopware-helper/facetMapper', () => ({ mapSelectedFiltersToShopwareFilters: () => ({}), mapShopwareAggregationToAvailableFilters: () => [] }));

const NOT_FOUND = { notFound: 'sentinel' };

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
    has: (key: string) => store.has(key),
  };
};

const context = {
  storefrontClient: { invoke: vi.fn() },
  settings: { catalog: { seoRouteNames: {} }, maxLimit: 100 },
  resolveCriteria: async (_entity: string, criteria: unknown) => criteria,
  currency: 'EUR',
};

type Run = (args: Record<string, unknown>) => Promise<unknown>;
type Resolve = { resolve: Run };

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
  vi.mocked(fetchAllProducts).mockReset();
  vi.mocked(getCart).mockReset();
});

describe('a slug Shopware does not know', () => {
  it('answers notFound() for a product slug', async () => {
    await expect(
      (productBySlug as unknown as Run)({ context, input: { slug: 'gone' }, passthrough: passthroughOf(), notFound: () => NOT_FOUND })
    ).resolves.toBe(NOT_FOUND);
  });

  it('answers notFound() for a category slug', async () => {
    await expect((categoryBySlug as unknown as Run)({ context, input: { slug: 'gone' }, notFound: () => NOT_FOUND })).resolves.toBe(
      NOT_FOUND
    );
  });

  it('answers notFound() for the products of a category slug', async () => {
    const run = productsByCategorySlug as unknown as Run;
    await expect(
      run({
        context,
        input: { categorySlug: 'gone' },
        pagination: { page: 1, limit: 24 },
        passthrough: passthroughOf(),
        notFound: () => NOT_FOUND,
      })
    ).resolves.toBe(NOT_FOUND);
  });
});

describe('the current cart', () => {
  it('answers notFound() for a cart without a token', async () => {
    vi.mocked(getCart).mockResolvedValue({} as never);

    await expect((cartGetCurrent as unknown as Run)({ context, passthrough: passthroughOf(), notFound: () => NOT_FOUND })).resolves.toBe(
      NOT_FOUND
    );
  });

  it('answers the token as the id', async () => {
    vi.mocked(getCart).mockResolvedValue({ token: 'cart-token' } as never);

    await expect((cartGetCurrent as unknown as Run)({ context, passthrough: passthroughOf(), notFound: () => NOT_FOUND })).resolves.toEqual(
      { id: 'cart-token' }
    );
  });
});

describe('entities Shopware does not return', () => {
  it('reports a product id Shopware answers with no product', async () => {
    vi.mocked(fetchAllProducts).mockResolvedValue([{ id: 'p1', translated: { name: 'Shoe' } }] as never);

    const result = (await (productResolver as unknown as Resolve).resolve({
      entityIds: ['p1', 'p2'],
      context,
      passthrough: passthroughOf(),
      $entity: (entity: unknown) => entity,
    })) as { notFound?: string[] };

    expect(result.notFound).toEqual(['p2']);
  });

  it('reports a category id Shopware answers with no category', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { elements: [{ id: 'c1', translated: { name: 'Shoes' } }] } });

    const result = (await (categoryResolver as unknown as Resolve).resolve({
      entityIds: ['c1', 'c2'],
      context,
      passthrough: passthroughOf(),
      $entity: (entity: unknown) => entity,
    })) as { notFound?: string[] };

    expect(result.notFound).toEqual(['c2']);
  });

  it('reports nothing for categories a query handed over', async () => {
    const result = (await (categoryResolver as unknown as Resolve).resolve({
      entityIds: ['c1', 'c2'],
      context,
      passthrough: passthroughOf({ categories: [{ id: 'c1', translated: { name: 'Shoes' } }] }),
      $entity: (entity: unknown) => entity,
    })) as { notFound?: string[] };

    expect(result.notFound ?? []).toEqual([]);
  });
});
