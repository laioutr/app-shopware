import { describe, expect, it, vi } from 'vitest';
import { withSortingFallback } from './sortingFallback';

const apiError = (status: number, code: string) => Object.assign(new Error('Failed request'), { status, details: { errors: [{ code }] } });

describe('withSortingFallback', () => {
  it('reads with the requested sort key', async () => {
    const read = vi.fn().mockResolvedValue('listing');

    await expect(withSortingFallback('price-asc', read)).resolves.toBe('listing');
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('price-asc');
  });

  it('reads again with the default sorting when Shopware does not know the key', async () => {
    const read = vi.fn().mockRejectedValueOnce(apiError(404, 'PRODUCT_SORTING_NOT_FOUND')).mockResolvedValueOnce('default listing');

    await expect(withSortingFallback('bogus-key', read)).resolves.toBe('default listing');
    expect(read).toHaveBeenLastCalledWith(undefined);
  });

  it('rethrows any other failure', async () => {
    const err = apiError(404, 'CONTENT__CATEGORY_NOT_FOUND');
    const read = vi.fn().mockRejectedValue(err);

    await expect(withSortingFallback('price-asc', read)).rejects.toBe(err);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('does not retry a read that sent no sort key', async () => {
    const err = apiError(404, 'PRODUCT_SORTING_NOT_FOUND');
    const read = vi.fn().mockRejectedValue(err);

    await expect(withSortingFallback(undefined, read)).rejects.toBe(err);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
