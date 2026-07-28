/**
 * Cookie options for the `sw-context-token` cookie on the laioutr domain. `httpOnly` so the
 * token is never readable by client JS (an XSS on laioutr can no longer exfiltrate it);
 * `secure` tracks the frontend request scheme. Pure — no `#imports` — so it is unit-testable.
 */
export const contextTokenCookieOptions = (secure: boolean) => ({
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  sameSite: 'lax' as const,
  secure,
  httpOnly: true as const,
});
