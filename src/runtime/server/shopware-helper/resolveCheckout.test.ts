// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { resolveCheckout } from './resolveCheckout';

const config = { endpoint: 'https://shop.example.com/store-api', accessToken: 'sw-key', storefrontUrl: 'https://shop.example.com' };

describe('resolveCheckout', () => {
  it('mints a code and returns the connect-session redirect on the happy path', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    const plan = await resolveCheckout({ config, contextToken: 'ctx-token', origin: 'https://store.laioutr.com', mint });

    expect(mint).toHaveBeenCalledWith({
      endpoint: 'https://shop.example.com/store-api',
      accessToken: 'sw-key',
      contextToken: 'ctx-token',
      loginSuccessCallback: 'https://store.laioutr.com',
      logoutSuccessCallback: 'https://store.laioutr.com',
      redirectRoute: 'frontend.checkout.confirm.page',
    });
    expect(plan).toEqual({ kind: 'redirect', url: 'https://shop.example.com/laioutr/connect-session?code=the-code' });
  });

  it('fails closed with 500 and never mints when storefrontUrl is unconfigured', async () => {
    const mint = vi.fn();

    const plan = await resolveCheckout({
      config: { endpoint: config.endpoint, accessToken: config.accessToken },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(plan).toEqual({ kind: 'error', statusCode: 500, statusMessage: 'Checkout is not configured' });
    expect(mint).not.toHaveBeenCalled();
  });

  it('redirects to the laioutr frontend root (never the storefront) without minting when there is no context token', async () => {
    const mint = vi.fn();

    const plan = await resolveCheckout({ config, contextToken: undefined, origin: 'https://store.laioutr.com', mint });

    expect(plan).toEqual({ kind: 'redirect', url: '/' });
    expect(mint).not.toHaveBeenCalled();
  });

  it('redirects to the frontend root even when storefrontUrl is unconfigured (no cart never needs the storefront)', async () => {
    const mint = vi.fn();

    const plan = await resolveCheckout({
      config: { endpoint: config.endpoint, accessToken: config.accessToken },
      contextToken: undefined,
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(plan).toEqual({ kind: 'redirect', url: '/' });
    expect(mint).not.toHaveBeenCalled();
  });

  it('fails closed with 502 and carries the cause when the mint throws', async () => {
    const cause = new Error('400 Callback domain is not allowed');
    const mint = vi.fn().mockRejectedValue(cause);

    const plan = await resolveCheckout({ config, contextToken: 'ctx-token', origin: 'https://store.laioutr.com', mint });

    expect(plan).toEqual({ kind: 'error', statusCode: 502, statusMessage: 'Checkout handoff failed', cause });
  });
});
