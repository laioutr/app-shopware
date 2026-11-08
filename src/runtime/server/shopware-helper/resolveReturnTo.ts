/**
 * Validate the destination a storefront auth bounce asks to be sent back to.
 *
 * The value arrives in a URL the browser followed, so anyone can craft one; only the configured
 * storefront origin is honoured and everything else falls back to the laioutr root. Comparing
 * parsed origins rather than string prefixes is what rejects a look-alike host.
 */
export const resolveReturnTo = (returnTo: unknown, storefrontUrl: string | undefined): string => {
  if (typeof returnTo !== 'string' || returnTo === '' || !storefrontUrl) {
    return '/';
  }

  try {
    const target = new URL(returnTo);
    return target.origin === new URL(storefrontUrl).origin ? target.href : '/';
  } catch {
    return '/';
  }
};
