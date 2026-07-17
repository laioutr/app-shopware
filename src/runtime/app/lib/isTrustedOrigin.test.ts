// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isTrustedOrigin } from './isTrustedOrigin';

describe('isTrustedOrigin', () => {
  const storefront = 'https://shop.example.com';

  it('accepts an exact origin match', () => {
    expect(isTrustedOrigin('https://shop.example.com', storefront)).toBe(true);
  });

  it('normalises a configured value that carries a trailing slash or path', () => {
    expect(isTrustedOrigin('https://shop.example.com', 'https://shop.example.com/')).toBe(true);
  });

  it('rejects a different host', () => {
    expect(isTrustedOrigin('https://evil.example.com', storefront)).toBe(false);
  });

  it('rejects a different scheme', () => {
    expect(isTrustedOrigin('http://shop.example.com', storefront)).toBe(false);
  });

  it('trusts nothing when the storefront origin is unset', () => {
    expect(isTrustedOrigin('https://shop.example.com', '')).toBe(false);
  });

  it('rejects an unparseable event origin', () => {
    expect(isTrustedOrigin('null', storefront)).toBe(false);
    expect(isTrustedOrigin('', storefront)).toBe(false);
  });
});
