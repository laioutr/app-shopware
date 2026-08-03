import { describe, expect, it, vi } from 'vitest';
import { readCategoryPageMeta } from './readCategoryPageMeta';
import type { StorefrontClient } from '../types/shopware';

const client = (invoke: ReturnType<typeof vi.fn>) => ({ invoke }) as unknown as StorefrontClient;

describe('readCategoryPageMeta', () => {
  it('maps the read category to page metadata', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        elements: [
          {
            id: 'cat-1',
            name: 'Chocolate Offers',
            updatedAt: '2026-03-18T14:04:23.697+00:00',
            media: { url: 'https://cdn.example/choc.png' },
          },
        ],
      },
    });

    await expect(readCategoryPageMeta(client(invoke), 'cat-1')).resolves.toEqual({
      title: 'Chocolate Offers',
      previewImage: 'https://cdn.example/choc.png',
      lastModified: '2026-03-18T14:04:23.697+00:00',
    });
  });

  it('requests only the resolved category', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { elements: [{ id: 'cat-1', name: 'C' }] } });

    await readCategoryPageMeta(client(invoke), 'cat-1');

    expect(invoke).toHaveBeenCalledWith(
      'readCategoryList post /category',
      expect.objectContaining({ body: expect.objectContaining({ ids: ['cat-1'] }) })
    );
  });

  it('returns undefined when the category is gone', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { elements: [] } });

    await expect(readCategoryPageMeta(client(invoke), 'cat-1')).resolves.toBeUndefined();
  });

  // Metadata is a labelling nicety — a failed read must never cost `locate` the subject it resolved.
  it('returns undefined when the read throws', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('store-api down'));

    await expect(readCategoryPageMeta(client(invoke), 'cat-1')).resolves.toBeUndefined();
  });
});
