// Re-exported from the shared const so both the server route handler and the client-side
// embedded checkout section resolve the same path from one definition.
export { ADOPT_SESSION_ENDPOINT_PATH, CHECKOUT_ENDPOINT_PATH } from '../../shared/const/checkout';

/**
 * Internal Shopware route the handoff lands on after the storefront session adopts
 * the cart context. Resolved server-side by the `LaioutrConnector` plugin's
 * `connect-session` route.
 */
export const CHECKOUT_REDIRECT_ROUTE = 'frontend.checkout.confirm.page';
