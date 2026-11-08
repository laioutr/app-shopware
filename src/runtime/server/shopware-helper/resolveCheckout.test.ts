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

  it('points the auth callbacks at the adopt route in redirect mode, so a storefront login syncs back', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({
      config: { ...config, checkoutMode: 'redirect' },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(mint).toHaveBeenCalledWith({
      endpoint: 'https://shop.example.com/store-api',
      accessToken: 'sw-key',
      contextToken: 'ctx-token',
      loginSuccessCallback: 'https://store.laioutr.com/app-shopware/adopt-session',
      logoutSuccessCallback: 'https://store.laioutr.com/app-shopware/adopt-session',
      redirectRoute: 'frontend.checkout.confirm.page',
    });
  });

  it('lets an explicit SSO callback override the adopt route', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({
      config: { ...config, checkoutMode: 'redirect', checkoutLoginCallbackUrl: 'https://idp.example.com/login' },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(mint.mock.calls[0][0].loginSuccessCallback).toBe('https://idp.example.com/login');
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

  it('uses the configured login/logout callback URLs when set, instead of the request origin', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({
      config: {
        ...config,
        checkoutLoginCallbackUrl: 'https://id.example.com/login',
        checkoutLogoutCallbackUrl: 'https://id.example.com/logout',
      },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({
        loginSuccessCallback: 'https://id.example.com/login',
        logoutSuccessCallback: 'https://id.example.com/logout',
      })
    );
  });

  it('falls back to the request origin for both callbacks when the config URLs are unset', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({ config, contextToken: 'ctx-token', origin: 'https://store.laioutr.com', mint });

    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({
        loginSuccessCallback: 'https://store.laioutr.com',
        logoutSuccessCallback: 'https://store.laioutr.com',
      })
    );
  });

  it('mints an edit-order handoff when a retry order is given', async () => {
    const mint = vi.fn().mockResolvedValue('code-1');

    const plan = await resolveCheckout({
      config,
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      retryOrderId: 'ord1',
      mint,
    });

    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectRoute: 'frontend.account.edit-order.page',
        // The marker tells the storefront this navigation is ours, so it does not bounce the
        // frame back to the page that opened it.
        redirectRouteParams: { orderId: 'ord1', 'laioutr-retry': '1' },
      })
    );
    expect(plan).toEqual({ kind: 'redirect', url: expect.stringContaining('code-1') });
  });

  it('mints a confirm handoff without route params when no retry order is given', async () => {
    const mint = vi.fn().mockResolvedValue('code-2');

    await resolveCheckout({ config, contextToken: 'ctx-token', origin: 'https://store.laioutr.com', mint });

    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({ redirectRoute: 'frontend.checkout.confirm.page' })
    );
    expect(mint.mock.calls[0][0].redirectRouteParams).toBeUndefined();
  });
});
