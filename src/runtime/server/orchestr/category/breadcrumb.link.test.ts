import { describe, expect, it, vi } from 'vitest';
import breadcrumbLink from './breadcrumb.link';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (definition: unknown) => definition }));

type Run = (args: Record<string, unknown>) => Promise<{ links: { sourceId: string; entities: unknown[] }[] }>;

const crumb = (categoryId: string, name: string, seoPathInfo: string) => ({
  apiAlias: 'breadcrumb',
  categoryId,
  name,
  path: seoPathInfo,
  type: 'page',
  seoUrls: [{ seoPathInfo, isCanonical: true }],
  translated: { categoryId, name, path: seoPathInfo, type: 'page' },
});

const run = (invoke: (operation: string, args: { pathParams: { id: string } }) => Promise<unknown>, entityIds: string[]) =>
  (breadcrumbLink as unknown as { run: Run }).run({
    context: { storefrontClient: { invoke: vi.fn(invoke) } },
    entityIds,
    $entity: (entity: { id: string; base: () => unknown }) => ({ id: entity.id, base: entity.base() }),
  });

describe('CategoryBreadcrumbLink', () => {
  it("answers Shopware's breadcrumb per category, and an empty one for a category whose read fails", async () => {
    const { links } = await run(
      async (_operation, { pathParams }) => {
        if (pathParams.id === 'cat-broken') throw Object.assign(new Error('boom'), { status: 500, details: { errors: [] } });
        return { data: [crumb('cat-living', 'Living', 'living/'), crumb('cat-sofas', 'Sofas', 'living/sofas/')] };
      },
      ['cat-sofas', 'cat-broken']
    );

    expect(links).toEqual([
      {
        sourceId: 'cat-sofas',
        entities: [
          {
            id: 'breadcrumb:cat-living',
            base: { name: 'Living', link: { type: 'reference', reference: { type: 'Category', slug: 'living', id: 'cat-living' } } },
          },
          {
            id: 'breadcrumb:cat-sofas',
            base: { name: 'Sofas', link: { type: 'reference', reference: { type: 'Category', slug: 'living/sofas', id: 'cat-sofas' } } },
          },
        ],
      },
      { sourceId: 'cat-broken', entities: [] },
    ]);
  });
});
