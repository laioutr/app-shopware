/**
 * Same-origin laioutr route that mints a handoff code and 302s to the storefront checkout.
 * Namespaced under the app's `/app-shopware/` prefix (the platform convention for app-owned
 * paths) so it never collides with editor content slugs and is not gated by the
 * secret-protected `/api/laioutr/*` namespace.
 */
export const CHECKOUT_ENDPOINT_PATH = '/app-shopware/checkout';

/**
 * Internal Shopware route the handoff lands on after the storefront session adopts
 * the cart context. Resolved server-side by the `LaioutrConnector` plugin's
 * `connect-session` route.
 */
export const CHECKOUT_REDIRECT_ROUTE = 'frontend.checkout.confirm.page';
