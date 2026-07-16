/**
 * Local Shopware route the checkout handoff lands on. Resolved server-side by the
 * `LaioutrConnector` plugin's `connect-session` route after it adopts the cart's
 * context token into the storefront session.
 */
export const CHECKOUT_REDIRECT_ROUTE = 'frontend.checkout.confirm.page';

/**
 * Build the session-preserving checkout URL against the `LaioutrConnector` plugin's
 * `/laioutr/connect-session` endpoint.
 *
 * SECURITY: the store-api context token travels in the query string. The plugin's
 * `docs/hardening.md` flags this contract for replacement with signed/expiring state
 * (token would otherwise land in history, `Referer`, and proxy logs). Swap the query
 * construction here once that protocol ships.
 */
export const buildCheckoutUrl = (params: { storefrontUrl: string; contextToken: string; origin: string }): string => {
  const base = params.storefrontUrl.replace(/\/+$/, '');
  const query = new URLSearchParams({
    'sw-context-token': params.contextToken,
    'redirect-route': CHECKOUT_REDIRECT_ROUTE,
    'login-success-callback': params.origin,
    'logout-success-callback': params.origin,
  });
  return `${base}/laioutr/connect-session?${query.toString()}`;
};
