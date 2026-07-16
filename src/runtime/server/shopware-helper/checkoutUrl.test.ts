// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCheckoutUrl } from './checkoutUrl';

describe('buildCheckoutUrl', () => {
  it('builds a connect-session URL with the context token and encoded callbacks', () => {
    const url = buildCheckoutUrl({
      storefrontUrl: 'https://shop.example.com',
      contextToken: 'abc123',
      origin: 'https://store.laioutr.com',
    });

    expect(url).toBe(
      'https://shop.example.com/laioutr/connect-session' +
        '?sw-context-token=abc123' +
        '&redirect-route=frontend.checkout.confirm.page' +
        '&login-success-callback=https%3A%2F%2Fstore.laioutr.com' +
        '&logout-success-callback=https%3A%2F%2Fstore.laioutr.com'
    );
  });

  it('trims a trailing slash from the storefront URL', () => {
    const url = buildCheckoutUrl({ storefrontUrl: 'https://shop.example.com/', contextToken: 'x', origin: 'https://a.b' });
    expect(url.startsWith('https://shop.example.com/laioutr/connect-session?')).toBe(true);
  });
});
