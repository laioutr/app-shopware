import { describe, expect, it } from 'vitest';
import { toCategoryPageEntry, toProductPageEntry } from './pageIndexEntries';
import type { ShopwareCategory, ShopwareProduct } from '../types/shopware';

const product = (overrides: Partial<ShopwareProduct>): ShopwareProduct =>
  ({
    id: 'prod-1',
    name: 'Flower Towel',
    seoUrls: [{ seoPathInfo: 'towel-flower-print', isCanonical: true }],
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }) as unknown as ShopwareProduct;

describe('toProductPageEntry', () => {
  it('maps a product to a PageIndexEntry using its canonical seo slug', () => {
    expect(toProductPageEntry(product({ cover: { media: { url: 'https://cdn.example/towel.jpg' } } as ShopwareProduct['cover'] }))).toEqual(
      {
        params: { slug: 'towel-flower-print' },
        subject: { type: 'Product', id: 'prod-1' },
        meta: { title: 'Flower Towel', previewImage: 'https://cdn.example/towel.jpg', lastModified: '2026-07-01T00:00:00Z' },
      }
    );
  });

  it('omits previewImage when the product has no cover', () => {
    expect(toProductPageEntry(product({ cover: undefined })).meta.previewImage).toBeUndefined();
  });

  it('falls back to a sluggified name when no seo url is present', () => {
    expect(toProductPageEntry(product({ seoUrls: [] })).params.slug).toBe('flower-towel-prod-1');
  });

  it('prefers the translated name for the title', () => {
    const entry = toProductPageEntry(product({ translated: { name: 'Blumen-Handtuch' } as ShopwareProduct['translated'] }));
    expect(entry.meta.title).toBe('Blumen-Handtuch');
  });
});

const categoryFixture = (overrides: Partial<ShopwareCategory>): ShopwareCategory =>
  ({
    id: 'cat-1',
    name: 'Chocolate Offers',
    seoUrls: [{ seoPathInfo: 'Vorteilsangebote/Schokoladenangebot/', isCanonical: true }],
    updatedAt: '2026-03-18T14:04:23.697+00:00',
    ...overrides,
  }) as unknown as ShopwareCategory;

describe('toCategoryPageEntry', () => {
  it('maps a category to a PageIndexEntry using its normalised canonical seo slug', () => {
    expect(toCategoryPageEntry(categoryFixture({ media: { url: 'https://cdn.example/choc.png' } as ShopwareCategory['media'] }))).toEqual({
      params: { slug: 'Vorteilsangebote/Schokoladenangebot' },
      subject: { type: 'Category', id: 'cat-1' },
      meta: {
        title: 'Chocolate Offers',
        previewImage: 'https://cdn.example/choc.png',
        lastModified: '2026-03-18T14:04:23.697+00:00',
      },
    });
  });

  it('omits previewImage when the category has no media', () => {
    expect(toCategoryPageEntry(categoryFixture({ media: undefined })).meta.previewImage).toBeUndefined();
  });

  it('falls back to a sluggified name when no seo url is present', () => {
    expect(toCategoryPageEntry(categoryFixture({ seoUrls: [] })).params.slug).toBe('chocolate-offers-cat-1');
  });

  it('prefers the translated name for the title', () => {
    const entry = toCategoryPageEntry(categoryFixture({ translated: { name: 'Schokoladenangebot' } as ShopwareCategory['translated'] }));
    expect(entry.meta.title).toBe('Schokoladenangebot');
  });
});
