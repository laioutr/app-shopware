// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contextTokenCookieOptions } from './contextTokenCookie';

describe('contextTokenCookieOptions', () => {
  it('is httpOnly, lax, root-path, and one year', () => {
    const options = contextTokenCookieOptions(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(60 * 60 * 24 * 365);
    expect(options.secure).toBe(true);
  });

  it('tracks the secure flag from the caller', () => {
    expect(contextTokenCookieOptions(false).secure).toBe(false);
  });
});
