import { describe, expect, it, vi } from 'vitest';
import { readShopwareBreadcrumb, toBreadcrumbItems } from './breadcrumb';

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
