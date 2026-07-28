// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adoptSessionToken } from './adoptSession';

const baseParams = {
  endpoint: 'https://shop.example.com/store-api',
  accessToken: 'SWSC-access-key',
  code: 'one-time-code',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adoptSessionToken', () => {
  it('posts the code with the sw-access-key header and returns the context token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ 'context-token': 'ctx-token-123' });
    vi.stubGlobal('$fetch', fetchMock);

    const token = await adoptSessionToken(baseParams);

    expect(token).toBe('ctx-token-123');
    expect(fetchMock).toHaveBeenCalledWith('https://shop.example.com/store-api/laioutr/session-adopt', {
      method: 'POST',
      headers: { 'sw-access-key': 'SWSC-access-key' },
      body: { code: 'one-time-code' },
    });
  });

  it('trims a trailing slash from the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ 'context-token': 't' });
    vi.stubGlobal('$fetch', fetchMock);

    await adoptSessionToken({ ...baseParams, endpoint: 'https://shop.example.com/store-api/' });

    expect(fetchMock).toHaveBeenCalledWith('https://shop.example.com/store-api/laioutr/session-adopt', expect.anything());
  });

  it('throws when the response carries no context token', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}));

    await expect(adoptSessionToken(baseParams)).rejects.toThrow('no context token');
  });

  it('surfaces the plugin error detail from a store-api 400 body', async () => {
    const fetchError = Object.assign(new Error('400 Bad Request'), {
      data: { errors: [{ status: '400', detail: 'Invalid or expired handoff code' }] },
    });
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(fetchError));

    await expect(adoptSessionToken(baseParams)).rejects.toThrow('session-adopt rejected: Invalid or expired handoff code');
  });
});
