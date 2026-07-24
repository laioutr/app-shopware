import { describe, expect, it } from 'vitest';
import { toProductPageRow } from './pageIndexRows';
import type { ShopwareProduct } from '../types/shopware';

const product = (overrides: Partial<ShopwareProduct>): ShopwareProduct =>
  ({
    id: 'prod-1',
    name: 'Flower Towel',
    seoUrls: [{ seoPathInfo: 'towel-flower-print', isCanonical: true }],
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }) as unknown as ShopwareProduct;

describe('toProductPageRow', () => {
  it('maps a product to a PageRow using its canonical seo slug', () => {
    expect(toProductPageRow(product({ cover: { media: { url: 'https://cdn.example/towel.jpg' } } as ShopwareProduct['cover'] }))).toEqual({
      params: { slug: 'towel-flower-print' },
      subject: { type: 'Product', id: 'prod-1' },
      meta: { title: 'Flower Towel', previewImage: 'https://cdn.example/towel.jpg', lastModified: '2026-07-01T00:00:00Z' },
    });
  });

  it('omits previewImage when the product has no cover', () => {
    expect(toProductPageRow(product({ cover: undefined })).meta.previewImage).toBeUndefined();
  });

  it('falls back to a sluggified name when no seo url is present', () => {
    expect(toProductPageRow(product({ seoUrls: [] })).params.slug).toBe('flower-towel-prod-1');
  });

  it('prefers the translated name for the title', () => {
    const row = toProductPageRow(product({ translated: { name: 'Blumen-Handtuch' } as ShopwareProduct['translated'] }));
    expect(row.meta.title).toBe('Blumen-Handtuch');
  });
});
