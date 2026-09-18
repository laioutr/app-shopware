// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveCheckoutLink } from './checkoutLink';

const storefrontUrl = 'https://shop.example.com';
const origin = 'https://store.laioutr.com';

describe('resolveCheckoutLink', () => {
  it('links to the merchant\u2019s Studio checkout page in embedded mode', () => {
    expect(resolveCheckoutLink({ storefrontUrl, origin, checkoutMode: 'embedded' })).toEqual({
      type: 'pageType',
      pageType: 'shopware/checkout',
    });
  });

  it('defaults to embedded when no mode is configured', () => {
    expect(resolveCheckoutLink({ storefrontUrl, origin })).toEqual({
      type: 'pageType',
      pageType: 'shopware/checkout',
    });
  });

  it('links to the handoff route as an absolute url in redirect mode', () => {
    expect(resolveCheckoutLink({ storefrontUrl, origin, checkoutMode: 'redirect' })).toEqual({
      type: 'url',
      href: 'https://store.laioutr.com/app-shopware/checkout',
    });
  });

  it('builds that url against the origin the request arrived on, so every market gets its own', () => {
    expect(
      resolveCheckoutLink({ storefrontUrl, origin: 'https://boutique.example.fr', checkoutMode: 'redirect' })
    ).toEqual({ type: 'url', href: 'https://boutique.example.fr/app-shopware/checkout' });
  });

  it('falls back to the bare path when no origin is known, rather than emitting a broken url', () => {
    expect(resolveCheckoutLink({ storefrontUrl, checkoutMode: 'redirect' })).toEqual({
      type: 'url',
      href: '/app-shopware/checkout',
    });
  });

  it('offers no link at all when no storefront is configured', () => {
    expect(resolveCheckoutLink({ origin, checkoutMode: 'redirect' })).toBeUndefined();
    expect(resolveCheckoutLink({ origin, checkoutMode: 'embedded' })).toBeUndefined();
  });
});
