import { beforeEach, describe, expect, it, vi } from 'vitest';
import breadcrumbLink from './breadcrumb.link';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));

type Item = { id: string; base: Record<string, unknown> };
type Run = (args: Record<string, unknown>) => Promise<{ links: { sourceId: string; entities: Item[] }[] }>;

const apiError = (status: number) => Object.assign(new Error('Failed request'), { status, details: { errors: [] } });

const crumb = (categoryId: string, name: string, seoPathInfo: string) => ({
  apiAlias: 'breadcrumb',
  categoryId,
  name,
  path: seoPathInfo,
  type: 'page',
  seoUrls: [{ seoPathInfo, isCanonical: true }],
  translated: { categoryId, name, path: seoPathInfo, type: 'page' },
});

const category = (id: string, name: string, path: string) => ({
  id,
  name,
  translated: { name },
  path,
  type: 'page',
  seoUrls: [{ seoPathInfo: `${id}/`, isCanonical: true }],
});

const shop = [category('living', 'Living', '|main-root|'), category('sofas', 'Sofas', '|main-root|living|')];
const routeAnswers: Record<string, unknown> = {
  sofas: [crumb('living', 'Wohnen', 'wohnen/'), crumb('sofas', 'Sofas', 'wohnen/sofas/')],
};

const invoke = vi.fn(async (operation: string, args: { pathParams?: { id: string }; body?: { ids: string[] } }) => {
  if (operation === 'readBreadcrumb get /breadcrumb/{id}') {
    const answer = routeAnswers[args.pathParams!.id];
    if (!answer) throw apiError(404);
    return { data: answer };
  }
  if (operation === 'readCategoryList post /category') {
    return { data: { elements: shop.filter((row) => args.body!.ids.includes(row.id)) } };
  }
  throw new Error(`unexpected operation ${operation}`);
});

const trailsOf = async (entityIds: string[], shopwareVersion: unknown) => {
  const { links } = await (breadcrumbLink as unknown as { run: Run }).run({
    context: { storefrontClient: { invoke }, shopwareVersion, categoryRoots: { navigation: 'main-root' } },
    entityIds,
    $entity: (entity: { id: string; base: () => Record<string, unknown> }) => ({ id: entity.id, base: entity.base() }),
  });
  return Object.fromEntries(links.map((link) => [link.sourceId, link.entities]));
};

const operations = () => invoke.mock.calls.map(([operation]) => operation);

beforeEach(() => {
  invoke.mockClear();
});

describe('CategoryBreadcrumbLink', () => {
  it("answers Shopware's own breadcrumb where the shop serves it, with the category as the current page", async () => {
    const trails = await trailsOf(['sofas'], [6, 6, 10, 27]);

    expect(trails.sofas).toEqual([
      {
        id: 'breadcrumb:living',
        base: {
          name: 'Wohnen',
          isCurrentPage: false,
          link: { type: 'reference', reference: { type: 'Category', slug: 'wohnen', id: 'living' } },
        },
      },
      {
        id: 'breadcrumb:sofas',
        base: {
          name: 'Sofas',
          isCurrentPage: true,
          link: { type: 'reference', reference: { type: 'Category', slug: 'wohnen/sofas', id: 'sofas' } },
        },
      },
    ]);
    expect(operations()).toEqual(['readBreadcrumb get /breadcrumb/{id}']);
  });

  it('builds the breadcrumb from the category path on a release without the route, without asking for it', async () => {
    const trails = await trailsOf(['sofas'], [6, 5, 6, 1]);

    expect(trails.sofas?.map((item) => [item.id, item.base.isCurrentPage])).toEqual([
      ['breadcrumb:living', false],
      ['breadcrumb:sofas', true],
    ]);
    expect(operations()).not.toContain('readBreadcrumb get /breadcrumb/{id}');
  });

  it('builds the breadcrumb from the category path where the route fails', async () => {
    const trails = await trailsOf(['living'], undefined);

    expect(trails.living).toEqual([
      {
        id: 'breadcrumb:living',
        base: {
          name: 'Living',
          isCurrentPage: true,
          link: { type: 'reference', reference: { type: 'Category', slug: 'living', id: 'living' } },
        },
      },
    ]);
  });

  it('leaves out a category neither the route nor the shop knows', async () => {
    const trails = await trailsOf(['sofas', 'missing'], [6, 7, 0, 0]);

    expect(Object.keys(trails)).toEqual(['sofas']);
  });
});
