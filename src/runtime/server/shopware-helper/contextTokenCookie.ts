/**
 * Cookie options for the `sw-context-token` cookie on the laioutr domain. `httpOnly` so the
 * token is never readable by client JS (an XSS on laioutr can no longer exfiltrate it).
 * Pure — no `#imports` — so it is unit-testable.
 */
export const contextTokenCookieOptions = () => ({
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true as const,
});
