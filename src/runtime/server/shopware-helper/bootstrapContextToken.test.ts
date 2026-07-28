// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapGuestContextToken } from './bootstrapContextToken';

const baseParams = {
  endpoint: 'https://shop.example.com/store-api',
  accessToken: 'SWSC-access-key',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// The helper reads a response header, so it uses `$fetch.raw`. Stub the ambient global with a
// `.raw` method (mirrors how sessionHandoff/adoptSession stub the ambient `$fetch`).
const stubFetchRaw = (impl: (...args: unknown[]) => unknown) => {
  const raw = vi.fn(impl);
  vi.stubGlobal('$fetch', Object.assign(vi.fn(), { raw }));
  return raw;
};

describe('bootstrapGuestContextToken', () => {
  it('GETs /context with the access key and returns the sw-context-token header', async () => {
    const raw = stubFetchRaw(() => ({ headers: new Headers({ 'sw-context-token': 'guest-token-123' }) }));

    const token = await bootstrapGuestContextToken(baseParams);

    expect(token).toBe('guest-token-123');
    expect(raw).toHaveBeenCalledWith('https://shop.example.com/store-api/context', {
      method: 'GET',
      headers: { 'sw-access-key': 'SWSC-access-key' },
    });
  });

  it('trims a trailing slash from the endpoint', async () => {
    const raw = stubFetchRaw(() => ({ headers: new Headers({ 'sw-context-token': 't' }) }));

    await bootstrapGuestContextToken({ ...baseParams, endpoint: 'https://shop.example.com/store-api/' });

    expect(raw).toHaveBeenCalledWith('https://shop.example.com/store-api/context', expect.anything());
  });

  it('throws when the response carries no context-token header', async () => {
    stubFetchRaw(() => ({ headers: new Headers() }));

    await expect(bootstrapGuestContextToken(baseParams)).rejects.toThrow('no context token');
  });

  it('surfaces the store-api error detail on failure', async () => {
    const err = Object.assign(new Error('403 Forbidden'), {
      data: { errors: [{ status: '403', detail: 'Access key is invalid' }] },
    });
    stubFetchRaw(() => {
      throw err;
    });

    await expect(bootstrapGuestContextToken(baseParams)).rejects.toThrow('guest context bootstrap failed: Access key is invalid');
  });
});
