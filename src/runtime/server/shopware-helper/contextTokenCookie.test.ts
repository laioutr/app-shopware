// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contextTokenCookieOptions } from './contextTokenCookie';

describe('contextTokenCookieOptions', () => {
  it('is httpOnly, lax, root-path, and one year', () => {
    const options = contextTokenCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(60 * 60 * 24 * 365);
  });

  it('leaves secure out, so the cookie writer derives it from the request origin', () => {
    expect(contextTokenCookieOptions()).not.toHaveProperty('secure');
  });
});
