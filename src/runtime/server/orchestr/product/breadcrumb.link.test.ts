import { beforeEach, describe, expect, it, vi } from 'vitest';
import breadcrumbLink from './breadcrumb.link';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));
vi.mock('../../const/passthroughTokens', () => ({ productsFragmentToken: 'products' }));

type Run = (args: Record<string, unknown>) => Promise<{ links: { sourceId: string; entities: unknown[] }[] }>;

const apiError = (status: number) => Object.assign(new Error('Failed request'), { status, details: { errors: [] } });

const product = {
  id: 'prod-1',
  name: 'Sofa Ada',
  translated: { name: 'Sofa Ada' },
  seoUrls: [{ seoPathInfo: 'sofa-ada/', isCanonical: true }],
  seoCategory: {
    id: 'cat-sofas',
    name: 'Sofas',
    translated: { name: 'Sofas' },
    seoUrls: [{ seoPathInfo: 'living/sofas/', isCanonical: true }],
  },
};

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
const run = () =>
  (breadcrumbLink as unknown as { run: Run }).run({
    context: { storefrontClient: { invoke } },
    entityIds: ['prod-1'],
    passthrough,
    $entity: (entity: { id: string; base: () => unknown }) => ({ id: entity.id, base: entity.base() }),
  });

beforeEach(() => {
  invoke.mockReset();
  passthrough.get.mockReset();
});

describe('ProductBreadcrumbLink', () => {
  it("walks Shopware's own breadcrumb down to the product", async () => {
    passthrough.get.mockReturnValue([product]);
    invoke.mockResolvedValue({ data: [crumb('cat-living', 'Living', 'living/'), crumb('cat-sofas', 'Sofas', 'living/sofas/')] });

    const { links } = await run();

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
            base: { name: 'Living', link: { type: 'reference', reference: { type: 'Category', slug: 'living', id: 'cat-living' } } },
          },
          {
            id: 'breadcrumb:cat-sofas',
            base: { name: 'Sofas', link: { type: 'reference', reference: { type: 'Category', slug: 'living/sofas', id: 'cat-sofas' } } },
          },
          {
            id: 'breadcrumb:prod-1',
            base: { name: 'Sofa Ada', link: { type: 'reference', reference: { type: 'Product', slug: 'sofa-ada', id: 'prod-1' } } },
          },
        ],
      },
    ]);
  });

  it("falls back to the product's main category when Shopware's breadcrumb cannot be read", async () => {
    passthrough.get.mockReturnValue(undefined);
    invoke.mockImplementation(async (operation: string) => {
      if (operation === 'readProduct post /product') return { data: { elements: [product] } };
      throw apiError(404);
    });

    const { links } = await run();

    expect(links[0]?.entities.map((entity) => (entity as { id: string }).id)).toEqual(['breadcrumb:cat-sofas', 'breadcrumb:prod-1']);
  });
});
