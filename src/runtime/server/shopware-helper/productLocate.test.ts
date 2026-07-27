import { describe, expect, it } from 'vitest';
import { buildProductLocate } from './productLocate';

describe('buildProductLocate', () => {
  it('builds subject + locales from a product id and a slug map', () => {
    expect(buildProductLocate('parent-1', { 'de-DE': 'handtuch', 'en-GB': 'towel' })).toEqual({
      subject: { type: 'Product', id: 'parent-1' },
      locales: {
        'de-DE': { params: { slug: 'handtuch' } },
        'en-GB': { params: { slug: 'towel' } },
      },
    });
  });

  it('omits locales without a slug', () => {
    expect(buildProductLocate('parent-1', { 'de-DE': 'handtuch', 'en-GB': undefined })).toEqual({
      subject: { type: 'Product', id: 'parent-1' },
      locales: { 'de-DE': { params: { slug: 'handtuch' } } },
    });
  });

  it('returns undefined when no product id resolved', () => {
    expect(buildProductLocate(undefined, { 'de-DE': 'handtuch' })).toBeUndefined();
  });

  it('carries page metadata when the product read supplied it', () => {
    const meta = { title: 'Handtuch', previewImage: 'https://cdn/handtuch.jpg', lastModified: '2026-07-01T00:00:00Z' };

    expect(buildProductLocate('parent-1', { 'de-DE': 'handtuch' }, meta)).toEqual({
      subject: { type: 'Product', id: 'parent-1' },
      meta,
      locales: { 'de-DE': { params: { slug: 'handtuch' } } },
    });
  });

  it('omits meta when the metadata read failed', () => {
    expect(buildProductLocate('parent-1', { 'de-DE': 'handtuch' }, undefined)).toEqual({
      subject: { type: 'Product', id: 'parent-1' },
      locales: { 'de-DE': { params: { slug: 'handtuch' } } },
    });
  });
});
