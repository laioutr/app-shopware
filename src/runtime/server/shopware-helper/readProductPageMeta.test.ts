import { describe, expect, it, vi } from 'vitest';
import { readProductPageMeta } from './readProductPageMeta';
import type { StorefrontClient } from '../types/shopware';

const client = (invoke: ReturnType<typeof vi.fn>) => ({ invoke }) as unknown as StorefrontClient;

describe('readProductPageMeta', () => {
  it('maps the read product to page metadata', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        elements: [
          {
            id: 'prod-1',
            name: 'Flower Towel',
            updatedAt: '2026-07-01T00:00:00Z',
            cover: { media: { url: 'https://cdn.example/towel.jpg' } },
          },
        ],
      },
    });

    await expect(readProductPageMeta(client(invoke), 'prod-1')).resolves.toEqual({
      title: 'Flower Towel',
      previewImage: 'https://cdn.example/towel.jpg',
      lastModified: '2026-07-01T00:00:00Z',
    });
  });

  it('requests only the resolved product', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { elements: [{ id: 'prod-1', name: 'T' }] } });

    await readProductPageMeta(client(invoke), 'prod-1');

    expect(invoke).toHaveBeenCalledWith(
      'readProduct post /product',
      expect.objectContaining({ body: expect.objectContaining({ ids: ['prod-1'] }) })
    );
  });

  it('returns undefined when the product is gone', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { elements: [] } });

    await expect(readProductPageMeta(client(invoke), 'prod-1')).resolves.toBeUndefined();
  });

  // Metadata is a labelling nicety — a failed read must never cost `locate` the subject it resolved.
  it('returns undefined when the read throws', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('store-api down'));

    await expect(readProductPageMeta(client(invoke), 'prod-1')).resolves.toBeUndefined();
  });
});
