import { describe, expect, it, vi } from 'vitest';
import categoryBreadcrumb from './breadcrumb.link';

// The link reaches Nuxt's auto-imports through this module, which a plain node run cannot resolve.
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (link: unknown) => link }));

type Item = { id: string; base: () => Record<string, unknown> };
type Result = { links: { sourceId: string; entities: Item[] }[] };
type Run = (args: Record<string, unknown>) => Promise<Result>;

const category = (id: string, name: string, path: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  translated: { name },
  path,
  type: 'page',
  seoUrls: [{ seoPathInfo: `c/${id}/`, isCanonical: true }],
  ...overrides,
});

const shop = [
  category('main-root', 'ShopKategorien', ''),
  category('moebel', 'Möbel', '|main-root|'),
  category('baenke', 'Bänke', '|main-root|moebel|'),
  category('eckbaenke', 'Eckbänke', '|main-root|moebel|baenke|'),
  category('kollektionen', 'Kollektionen', '|main-root|', { type: 'folder', seoUrls: [] }),
  category('landhaus', 'Landhaus', '|main-root|kollektionen|'),
];

const storefrontClient = {
  invoke: vi.fn(async (operation: string, params?: { body?: { ids?: string[] } }) => {
    if (operation === 'readCategoryList post /category') {
      const ids = params?.body?.ids ?? [];
      return { data: { elements: shop.filter((row) => ids.includes(row.id)) } };
    }
    throw new Error(`unexpected operation ${operation}`);
  }),
};

const trailsOf = async (entityIds: string[], context: Record<string, unknown> = {}) => {
  const result = await (categoryBreadcrumb as unknown as { run: Run }).run({
    entityIds,
    context: { storefrontClient, categoryRoots: { navigation: 'main-root', service: 'service-root' }, ...context },
    passthrough: { get: () => undefined, has: () => false },
    $entity: (entity: unknown) => entity,
  });

  return Object.fromEntries(result.links.map((link) => [link.sourceId, link.entities.map((item) => ({ id: item.id, ...item.base() }))]));
};

describe('CategoryBreadcrumbLink', () => {
  it('lists the ancestors below the navigation root, then the category as the current page', async () => {
    const trails = await trailsOf(['eckbaenke']);

    expect(trails.eckbaenke).toEqual([
      {
        id: 'breadcrumb:moebel',
        name: 'Möbel',
        isCurrentPage: false,
        link: { type: 'reference', reference: { type: 'Category', slug: 'c/moebel', id: 'moebel' } },
      },
      {
        id: 'breadcrumb:baenke',
        name: 'Bänke',
        isCurrentPage: false,
        link: { type: 'reference', reference: { type: 'Category', slug: 'c/baenke', id: 'baenke' } },
      },
      {
        id: 'breadcrumb:eckbaenke',
        name: 'Eckbänke',
        isCurrentPage: true,
        link: { type: 'reference', reference: { type: 'Category', slug: 'c/eckbaenke', id: 'eckbaenke' } },
      },
    ]);
  });

  it('is the category alone for a top-level category', async () => {
    const trails = await trailsOf(['moebel']);

    expect(trails.moebel).toEqual([expect.objectContaining({ id: 'breadcrumb:moebel', name: 'Möbel', isCurrentPage: true })]);
  });

  it('names a folder without linking it, as a folder has no page', async () => {
    const trails = await trailsOf(['landhaus']);

    expect(trails.landhaus?.[0]).toEqual({ id: 'breadcrumb:kollektionen', name: 'Kollektionen', isCurrentPage: false });
  });

  it('is the whole path while the category roots are unknown', async () => {
    const trails = await trailsOf(['moebel'], { categoryRoots: undefined });

    expect(trails.moebel?.map((item) => item.id)).toEqual(['breadcrumb:main-root', 'breadcrumb:moebel']);
  });

  it('resolves every source of a batch and leaves out a category the shop does not return', async () => {
    const trails = await trailsOf(['eckbaenke', 'missing', 'landhaus']);

    expect(Object.keys(trails)).toEqual(['eckbaenke', 'landhaus']);
    expect(trails.landhaus?.map((item) => item.id)).toEqual(['breadcrumb:kollektionen', 'breadcrumb:landhaus']);
  });
});
