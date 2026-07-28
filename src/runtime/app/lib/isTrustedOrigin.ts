/**
 * Whether a `MessageEvent.origin` may be trusted as the embedded storefront.
 *
 * The parent frame only ever talks to the one storefront it embedded, so trust is an
 * exact origin match against the configured storefront origin. An unset
 * `storefrontOrigin` (misconfigured app) trusts nothing; an unparseable event origin
 * (e.g. `"null"` from a sandboxed frame) is rejected.
 */
export const isTrustedOrigin = (eventOrigin: string, storefrontOrigin: string): boolean => {
  if (!storefrontOrigin) return false;
  try {
    return new URL(eventOrigin).origin === new URL(storefrontOrigin).origin;
  } catch {
    return false;
  }
};
