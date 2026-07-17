// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mintSessionHandoffCode } from './sessionHandoff';

const baseParams = {
  endpoint: 'https://shop.example.com/store-api',
  accessToken: 'SWSC-access-key',
  contextToken: 'ctx-token-123',
  loginSuccessCallback: 'https://store.laioutr.com',
  logoutSuccessCallback: 'https://store.laioutr.com',
  redirectRoute: 'frontend.checkout.confirm.page',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mintSessionHandoffCode', () => {
  it('posts to the session-handoff endpoint with the sw-* headers and kebab-case body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ code: 'one-time-code' });
    vi.stubGlobal('$fetch', fetchMock);

    const code = await mintSessionHandoffCode(baseParams);

    expect(code).toBe('one-time-code');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://shop.example.com/store-api/laioutr/session-handoff', {
      method: 'POST',
      headers: {
        'sw-access-key': 'SWSC-access-key',
        'sw-context-token': 'ctx-token-123',
      },
      body: {
        'login-success-callback': 'https://store.laioutr.com',
        'logout-success-callback': 'https://store.laioutr.com',
        'redirect-route': 'frontend.checkout.confirm.page',
      },
    });
  });

  it('trims a trailing slash from the endpoint before appending the route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ code: 'c' });
    vi.stubGlobal('$fetch', fetchMock);

    await mintSessionHandoffCode({ ...baseParams, endpoint: 'https://shop.example.com/store-api/' });

    expect(fetchMock).toHaveBeenCalledWith('https://shop.example.com/store-api/laioutr/session-handoff', expect.anything());
  });

  it('throws when the mint response carries no code', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}));

    await expect(mintSessionHandoffCode(baseParams)).rejects.toThrow('no code');
  });

  it('propagates a rejected mint request', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('400 Callback domain is not allowed')));

    await expect(mintSessionHandoffCode(baseParams)).rejects.toThrow('Callback domain is not allowed');
  });

  it('surfaces the plugin error detail from a store-api 400 body', async () => {
    const fetchError = Object.assign(new Error('400 Bad Request'), {
      data: { errors: [{ status: '400', detail: 'Callback domain is not allowed' }] },
    });
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(fetchError));

    await expect(mintSessionHandoffCode(baseParams)).rejects.toThrow('session-handoff mint rejected: Callback domain is not allowed');
  });
});
