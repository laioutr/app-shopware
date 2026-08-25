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

/**
 * Same-origin route the embedded checkout section POSTs to on `laioutr:auth-changed`. It
 * redeems the single-use handoff code for the customer-bound context token (login) or clears
 * the token (logout) server-side — the token never reaches the browser. Shares the app's
 * `/app-shopware/` prefix so it stays clear of editor content slugs and the secret-protected
 * `/api/laioutr/*` namespace.
 */
export const ADOPT_SESSION_ENDPOINT_PATH = '/app-shopware/adopt-session';

/**
 * Same-origin route the embedded checkout section POSTs to for a fresh single-use handoff
 * code, which it then hands to the storefront frame.
 *
 * The confirm form submits into the top-level window so redirect-based payment providers are
 * never framed. When the storefront sits on a different registrable domain than laioutr, that
 * top-level request lands in a cookie jar with no storefront session, so the code travels in
 * the form and installs one before the order is placed. Minting stays server-side: the raw
 * `sw-context-token` never reaches the browser.
 */
export const ORDER_HANDOFF_ENDPOINT_PATH = '/app-shopware/order-handoff';

/**
 * Storefront route name of the checkout confirm page.
 *
 * The section only keeps a handoff code minted while the frame sits on this page: it is the
 * only page whose submit needs one, and a code outlives its mint by about a minute.
 */
export const CHECKOUT_CONFIRM_ROUTE = 'frontend.checkout.confirm.page';

/**
 * Storefront route that can still take payment for an order whose cart is gone. A cancelled or
 * declined payment lands here, and the frame is pointed at it so the retry happens in place.
 */
export const CHECKOUT_RETRY_ROUTE = 'frontend.account.edit-order.page';

/** Query key the storefront uses to hand a failed order back for a retry. */
export const RETRY_ORDER_QUERY_KEY = 'retry-order';

/**
 * Marks the frame's own navigation to the retry route, so the storefront leaves it in place.
 *
 * Without it the storefront cannot tell this apart from a shopper the payment provider bounced
 * to the same route at top level, and would send the frame back to Laioutr — which points the
 * frame at the retry again, forever.
 */
export const RETRY_FRAME_MARKER_KEY = 'laioutr-retry';
