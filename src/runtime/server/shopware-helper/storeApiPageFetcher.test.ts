import { describe, expect, it, vi } from 'vitest';
import { SHOPWARE_MAX_LIMIT, storeApiPageFetcher } from './storeApiPageFetcher';
import type { PageIndexEntry } from '@laioutr-core/core-types/orchestr';

interface Row {
  id: string;
}

const toEntry = (row: Row): PageIndexEntry => ({
  params: { slug: row.id },
  subject: { type: 'Category', id: row.id },
  meta: { title: row.id },
});

const rows = (count: number): Row[] => Array.from({ length: count }, (_, index) => ({ id: `row-${index}` }));

describe('SHOPWARE_MAX_LIMIT', () => {
  it('is the store API limit cap', () => {
    expect(SHOPWARE_MAX_LIMIT).toBe(100);
  });
});

describe('storeApiPageFetcher', () => {
  it('requests page 1 at the given batch size when there is no cursor', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: rows(2) });

    await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: undefined });

    expect(readPage).toHaveBeenCalledWith({ page: 1, limit: 2 });
  });

  it('resumes from the page number held in the cursor', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: rows(2) });

    await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: '4' });

    expect(readPage).toHaveBeenCalledWith({ page: 4, limit: 2 });
  });

  it('maps every element through toEntry', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: rows(2) });

    const page = await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: undefined });

    expect(page.entries).toEqual([
      { params: { slug: 'row-0' }, subject: { type: 'Category', id: 'row-0' }, meta: { title: 'row-0' } },
      { params: { slug: 'row-1' }, subject: { type: 'Category', id: 'row-1' }, meta: { title: 'row-1' } },
    ]);
  });

  it('advances the cursor when the page came back full', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: rows(2) });

    const page = await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: '3' });

    expect(page.nextCursor).toBe('4');
  });

  it('ends the walk on a short page', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: rows(1) });

    const page = await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: undefined });

    expect(page.nextCursor).toBeUndefined();
  });

  it('ends the walk on an empty page, which is how an exact-multiple enumeration terminates', async () => {
    const readPage = vi.fn().mockResolvedValue({ elements: [] });

    const page = await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: '2' });

    expect(page).toEqual({ entries: [], nextCursor: undefined });
  });

  it('treats a missing elements array as an empty page', async () => {
    const readPage = vi.fn().mockResolvedValue({});

    const page = await storeApiPageFetcher(readPage, toEntry, 2)({ cursor: undefined });

    expect(page).toEqual({ entries: [], nextCursor: undefined });
  });
});
