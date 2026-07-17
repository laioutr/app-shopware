/**
 * Same-origin laioutr route that mints a handoff code and 302s to the storefront checkout.
 * Namespaced under the app's `/app-shopware/` prefix (the platform convention for app-owned
 * paths) so it never collides with editor content slugs and is not gated by the
 * secret-protected `/api/laioutr/*` namespace.
 *
 * Isomorphic: the server route handler is registered at this path, and the embedded
 * checkout section (`ShopwareEmbedFrame`) uses it as the iframe `src`.
 */
export const CHECKOUT_ENDPOINT_PATH = '/app-shopware/checkout';
