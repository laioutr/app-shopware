import { describe, expect, it, vi } from 'vitest';
import { readCategoryTrails, readProductMainCategory, readShopwareBreadcrumb, readTrailsOfPaths, toBreadcrumbItems } from './breadcrumb';

const crumb = (overrides: Record<string, unknown>) =>
  ({
    apiAlias: 'breadcrumb',
    categoryId: 'cat-1',
    name: 'Living',
    path: 'Living/',
    type: 'page',
    translated: { categoryId: 'cat-1', name: 'Wohnen', path: 'Living/', type: 'page' },
    ...overrides,
  }) as never;

describe('toBreadcrumbItems', () => {
  it('links a page to its category by its canonical SEO URL, in the translated name', () => {
    const items = toBreadcrumbItems([
      crumb({
        seoUrls: [
          { seoPathInfo: 'old-living/', isCanonical: false },
          { seoPathInfo: 'wohnen/', isCanonical: true },
        ],
      }),
    ]);

    expect(items).toEqual([
      { id: 'breadcrumb:cat-1', name: 'Wohnen', link: { type: 'reference', reference: { type: 'Category', slug: 'wohnen', id: 'cat-1' } } },
    ]);
  });

  it('falls back to the path, and to a slug ending in the id when the path is the technical route', () => {
    const [fromPath, fromFallback] = toBreadcrumbItems([
      crumb({}),
      crumb({ categoryId: 'cat-2', path: 'navigation/cat-2', translated: { categoryId: 'cat-2', name: 'Sofas', path: '', type: 'page' } }),
    ]);

    expect(fromPath?.link).toMatchObject({ reference: { slug: 'Living' } });
    expect(fromFallback?.link).toMatchObject({ reference: { slug: 'sofas-cat-2', id: 'cat-2' } });
  });

  it('links an external link category to its URL and leaves a folder unlinked', () => {
    const [link, folder] = toBreadcrumbItems([
      crumb({
        categoryId: 'cat-link',
        type: 'link',
        translated: { name: 'Outlet', linkType: 'external', externalLink: 'https://outlet.example.com' },
      }),
      crumb({ categoryId: 'cat-folder', type: 'folder', translated: { name: 'Rooms' } }),
    ]);

    expect(link).toEqual({ id: 'breadcrumb:cat-link', name: 'Outlet', link: { type: 'url', href: 'https://outlet.example.com' } });
    expect(folder).toEqual({ id: 'breadcrumb:cat-folder', name: 'Rooms' });
  });
});

describe('readShopwareBreadcrumb', () => {
  it('reads the breadcrumb of the given type', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: [crumb({})] });

    await expect(readShopwareBreadcrumb({ invoke } as never, 'prod-1', 'product')).resolves.toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith('readBreadcrumb get /breadcrumb/{id}', {
      pathParams: { id: 'prod-1' },
      query: { type: 'product' },
    });
  });

  it('answers undefined when the route fails, as on a release without it', async () => {
    const invoke = vi.fn().mockRejectedValue(Object.assign(new Error('Not found'), { status: 404, details: { errors: [] } }));

    await expect(readShopwareBreadcrumb({ invoke } as never, 'prod-1', 'product')).resolves.toBeUndefined();
  });
});

describe('readCategoryTrails', () => {
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
    category('main-root', 'Catalogue', ''),
    category('living', 'Living', '|main-root|'),
    category('sofas', 'Sofas', '|main-root|living|'),
    category('rooms', 'Rooms', '|main-root|', { type: 'folder', seoUrls: [] }),
    category('kitchen', 'Kitchen', '|main-root|rooms|'),
    category('outlet', 'Outlet', '|main-root|', {
      type: 'link',
      seoUrls: [],
      translated: { name: 'Outlet', linkType: 'external', externalLink: 'https://outlet.example.com' },
    }),
    category('deals', 'Deals', '|main-root|outlet|'),
  ];

  const client = {
    invoke: vi.fn(async (_operation: string, { body }: { body: { ids: string[] } }) => ({
      data: { elements: shop.filter((row) => body.ids.includes(row.id)) },
    })),
  };

  const trailsOf = (ids: string[], { roots }: { roots?: unknown } = { roots: { navigation: 'main-root' } }) =>
    readCategoryTrails(client as never, roots as never, ids);

  it('lists the ancestors below the root, then the category, each linked by its SEO URL', async () => {
    const trails = await trailsOf(['sofas']);

    expect(trails.get('sofas')).toEqual([
      {
        id: 'breadcrumb:living',
        name: 'Living',
        link: { type: 'reference', reference: { type: 'Category', slug: 'c/living', id: 'living' } },
      },
      { id: 'breadcrumb:sofas', name: 'Sofas', link: { type: 'reference', reference: { type: 'Category', slug: 'c/sofas', id: 'sofas' } } },
    ]);
  });

  it('leaves a folder unlinked and links an external link category to its URL', async () => {
    const trails = await trailsOf(['kitchen', 'deals']);

    expect(trails.get('kitchen')?.[0]).toEqual({ id: 'breadcrumb:rooms', name: 'Rooms' });
    expect(trails.get('deals')?.[0]).toEqual({
      id: 'breadcrumb:outlet',
      name: 'Outlet',
      link: { type: 'url', href: 'https://outlet.example.com' },
    });
  });

  it('has no trail for a category the shop does not return, and reads nothing for no ids', async () => {
    client.invoke.mockClear();

    expect((await trailsOf(['missing'])).has('missing')).toBe(false);
    expect((await trailsOf([])).size).toBe(0);
    expect(client.invoke).toHaveBeenCalledTimes(1);
  });

  it('is the whole path while the roots are unknown', async () => {
    const trails = await trailsOf(['living'], { roots: undefined });

    expect(trails.get('living')?.map((item) => item.id)).toEqual(['breadcrumb:main-root', 'breadcrumb:living']);
  });

  it('builds a trail from a path already at hand, reading all of its categories in one request', async () => {
    client.invoke.mockClear();

    const trails = await readTrailsOfPaths(client as never, { navigation: 'main-root' }, [{ id: 'sofas', path: '|main-root|living|' }]);

    expect(trails.get('sofas')?.map((item) => item.name)).toEqual(['Living', 'Sofas']);
    expect(client.invoke).toHaveBeenCalledTimes(1);
  });
});

describe('readProductMainCategory', () => {
  it("reads the product's main category and its path from the detail route", async () => {
    const seoCategory = { id: 'cat-sofas', path: '|main-root|cat-living|' };
    const invoke = vi.fn().mockResolvedValue({ data: { product: { id: 'prod-1', seoCategory } } });

    await expect(readProductMainCategory({ invoke } as never, 'prod-1')).resolves.toEqual(seoCategory);
    expect(invoke).toHaveBeenCalledWith(
      'readProductDetail post /product/{productId}',
      expect.objectContaining({ pathParams: { productId: 'prod-1' } })
    );
  });

  it('answers undefined when the read fails', async () => {
    const invoke = vi.fn().mockRejectedValue(Object.assign(new Error('Not found'), { status: 404, details: { errors: [] } }));

    await expect(readProductMainCategory({ invoke } as never, 'prod-1')).resolves.toBeUndefined();
  });
});
