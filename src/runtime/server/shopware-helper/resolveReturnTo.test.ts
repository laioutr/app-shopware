// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveReturnTo } from './resolveReturnTo';

const storefront = 'https://shop.example.com';

describe('resolveReturnTo', () => {
  it('returns a target on the configured storefront origin', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm', storefront)).toBe(
      'https://shop.example.com/checkout/confirm'
    );
  });

  it('preserves the query the storefront put on it', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm?step=2', storefront)).toBe(
      'https://shop.example.com/checkout/confirm?step=2'
    );
  });

  it('refuses a foreign origin rather than becoming an open redirect', () => {
    expect(resolveReturnTo('https://evil.example.com/steal', storefront)).toBe('/');
  });

  it('refuses a look-alike host', () => {
    expect(resolveReturnTo('https://shop.example.com.evil.test/steal', storefront)).toBe('/');
  });

  it('refuses a scheme downgrade on the right host', () => {
    expect(resolveReturnTo('http://shop.example.com/checkout/confirm', storefront)).toBe('/');
  });

  it('refuses a relative path, which names no origin to check', () => {
    expect(resolveReturnTo('/checkout/confirm', storefront)).toBe('/');
  });

  it('falls back when the value is absent, empty or not a string', () => {
    expect(resolveReturnTo(undefined, storefront)).toBe('/');
    expect(resolveReturnTo('', storefront)).toBe('/');
    expect(resolveReturnTo(['https://shop.example.com/a'], storefront)).toBe('/');
  });

  it('falls back when no storefront is configured to compare against', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm', undefined)).toBe('/');
  });

  it('falls back on an unparseable value', () => {
    expect(resolveReturnTo('http://[', storefront)).toBe('/');
  });
});
