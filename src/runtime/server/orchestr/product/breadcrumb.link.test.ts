import { beforeEach, describe, expect, it, vi } from 'vitest';
import breadcrumbLink from './breadcrumb.link';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ productsFragmentToken: 'products' }));

type Item = { id: string; base: Record<string, unknown> };
type Run = (args: Record<string, unknown>) => Promise<{ links: { sourceId: string; entities: Item[] }[] }>;

const apiError = (status: number) => Object.assign(new Error('Failed request'), { status, details: { errors: [] } });

const product = {
  id: 'prod-1',
  name: 'Sofa Ada',
  translated: { name: 'Sofa Ada' },
  seoUrls: [{ seoPathInfo: 'sofa-ada/', isCanonical: true }],
  // The list route leaves the main category empty; only the detail route works it out.
  seoCategory: null,
};

const categories = [
  {
    id: 'cat-living',
    name: 'Living',
    translated: { name: 'Living' },
    path: '|main-root|',
    type: 'page',
    seoUrls: [{ seoPathInfo: 'living/', isCanonical: true }],
  },
  {
    id: 'cat-sofas',
    name: 'Sofas',
    translated: { name: 'Sofas' },
    path: '|main-root|cat-living|',
    type: 'page',
    seoUrls: [{ seoPathInfo: 'living/sofas/', isCanonical: true }],
  },
];

const crumb = (categoryId: string, name: string, seoPathInfo: string) => ({
  apiAlias: 'breadcrumb',
  categoryId,
  name,
  path: seoPathInfo,
  type: 'page',
  seoUrls: [{ seoPathInfo, isCanonical: true }],
  translated: { categoryId, name, path: seoPathInfo, type: 'page' },
});

const invoke = vi.fn();
const passthrough = { get: vi.fn() };
const run = (shopwareVersion: unknown) =>
  (breadcrumbLink as unknown as { run: Run }).run({
    context: { storefrontClient: { invoke }, shopwareVersion, categoryRoots: { navigation: 'main-root' } },
    entityIds: ['prod-1'],
    passthrough,
    $entity: (entity: { id: string; base: () => Record<string, unknown> }) => ({ id: entity.id, base: entity.base() }),
  });

/** A shop whose breadcrumb route answers with `route`, or fails when it is undefined. */
const shopAnswering = (route: unknown[] | undefined) =>
  invoke.mockImplementation(async (operation: string, args: { body?: { ids: string[] } }) => {
    if (operation === 'readProduct post /product') return { data: { elements: [product] } };
    if (operation === 'readProductDetail post /product/{productId}') {
      return { data: { product: { id: product.id, seoCategory: { id: 'cat-sofas', path: '|main-root|cat-living|' } } } };
    }
    if (operation === 'readCategoryList post /category') {
      return { data: { elements: categories.filter((row) => args.body!.ids.includes(row.id)) } };
    }
    if (operation === 'readBreadcrumb get /breadcrumb/{id}' && route) return { data: route };
    throw apiError(404);
  });

const operations = () => invoke.mock.calls.map(([operation]) => operation);

beforeEach(() => {
  invoke.mockReset();
  passthrough.get.mockReset();
});

describe('ProductBreadcrumbLink', () => {
  it("walks Shopware's own breadcrumb down to the product, the current page", async () => {
    passthrough.get.mockReturnValue([product]);
    shopAnswering([crumb('cat-living', 'Wohnen', 'wohnen/'), crumb('cat-sofas', 'Sofas', 'wohnen/sofas/')]);

    const { links } = await run([6, 6, 10, 27]);

    expect(invoke).toHaveBeenCalledWith('readBreadcrumb get /breadcrumb/{id}', {
      pathParams: { id: 'prod-1' },
      query: { type: 'product' },
    });
    expect(links).toEqual([
      {
        sourceId: 'prod-1',
        entities: [
          {
            id: 'breadcrumb:cat-living',
            base: {
              name: 'Wohnen',
              isCurrentPage: false,
              link: { type: 'reference', reference: { type: 'Category', slug: 'wohnen', id: 'cat-living' } },
            },
          },
          {
            id: 'breadcrumb:cat-sofas',
            base: {
              name: 'Sofas',
              isCurrentPage: false,
              link: { type: 'reference', reference: { type: 'Category', slug: 'wohnen/sofas', id: 'cat-sofas' } },
            },
          },
          {
            id: 'breadcrumb:prod-1',
            base: {
              name: 'Sofa Ada',
              isCurrentPage: true,
              link: { type: 'reference', reference: { type: 'Product', slug: 'sofa-ada', id: 'prod-1' } },
            },
          },
        ],
      },
    ]);
  });

  it("builds the path of the product's main category where Shopware's breadcrumb cannot be read", async () => {
    shopAnswering(undefined);

    const { links } = await run(undefined);

    expect(links[0]?.entities.map((entity) => entity.id)).toEqual(['breadcrumb:cat-living', 'breadcrumb:cat-sofas', 'breadcrumb:prod-1']);
  });

  it('builds the same path on a release without the route, without asking for it', async () => {
    shopAnswering([crumb('cat-living', 'Wohnen', 'wohnen/')]);

    const { links } = await run([6, 5, 6, 1]);

    expect(links[0]?.entities.map((entity) => entity.base.name)).toEqual(['Living', 'Sofas', 'Sofa Ada']);
    expect(operations()).not.toContain('readBreadcrumb get /breadcrumb/{id}');
  });

  it('reads every category of the path in one request', async () => {
    shopAnswering(undefined);

    await run([6, 5, 6, 1]);

    expect(operations().filter((operation) => operation === 'readCategoryList post /category')).toHaveLength(1);
  });

  it('asks for the main category alongside the product read, not after it', async () => {
    let markDetailAsked!: () => void;
    const detailAsked = new Promise<void>((resolve) => (markDetailAsked = resolve));
    shopAnswering(undefined);
    const answer = invoke.getMockImplementation()!;
    invoke.mockImplementation(async (operation: string, args: unknown) => {
      if (operation === 'readProduct post /product') await detailAsked;
      if (operation === 'readProductDetail post /product/{productId}') markDetailAsked();
      return answer(operation, args);
    });

    const { links } = await run([6, 5, 6, 1]);

    expect(links[0]?.entities).toHaveLength(3);
  }, 1000);
});
