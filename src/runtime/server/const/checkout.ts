import { CHECKOUT_CONFIRM_ROUTE } from '../../shared/const/checkout';

// Re-exported from the shared const so both the server route handlers and the client-side
// embedded checkout section resolve the same paths from one definition.
export {
  ADOPT_SESSION_ENDPOINT_PATH,
  CHECKOUT_ENDPOINT_PATH,
  CHECKOUT_RETRY_ROUTE,
  ORDER_HANDOFF_ENDPOINT_PATH,
  RETRY_FRAME_MARKER_KEY,
  RETRY_ORDER_QUERY_KEY,
} from '../../shared/const/checkout';

/**
 * Internal Shopware route the handoff lands on after the storefront session adopts
 * the cart context. Resolved server-side by the `LaioutrConnector` plugin's
 * `connect-session` route.
 */
export const CHECKOUT_REDIRECT_ROUTE = CHECKOUT_CONFIRM_ROUTE;
