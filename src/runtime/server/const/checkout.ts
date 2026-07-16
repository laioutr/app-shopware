/** Same-origin laioutr route that mints a handoff code and 302s to the storefront checkout. */
export const CHECKOUT_ENDPOINT_PATH = '/api/laioutr/shopware/checkout';

/**
 * Internal Shopware route the handoff lands on after the storefront session adopts
 * the cart context. Resolved server-side by the `LaioutrConnector` plugin's
 * `connect-session` route.
 */
export const CHECKOUT_REDIRECT_ROUTE = 'frontend.checkout.confirm.page';
