// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveCheckoutLink } from './checkoutLink';

const storefrontUrl = 'https://shop.example.com';

describe('resolveCheckoutLink', () => {
  it('links to the merchant’s Studio checkout page in embedded mode', () => {
    expect(resolveCheckoutLink({ storefrontUrl, checkoutMode: 'embedded' })).toEqual({
      type: 'pageType',
      pageType: 'shopware/checkout',
    });
  });

  it('defaults to embedded when no mode is configured', () => {
    expect(resolveCheckoutLink({ storefrontUrl })).toEqual({ type: 'pageType', pageType: 'shopware/checkout' });
  });

  it('links straight to the handoff route in redirect mode, needing no Studio page', () => {
    expect(resolveCheckoutLink({ storefrontUrl, checkoutMode: 'redirect' })).toEqual({
      type: 'url',
      href: '/app-shopware/checkout',
    });
  });

  it('offers no link at all when no storefront is configured', () => {
    expect(resolveCheckoutLink({ checkoutMode: 'redirect' })).toBeUndefined();
    expect(resolveCheckoutLink({ checkoutMode: 'embedded' })).toBeUndefined();
  });
});
