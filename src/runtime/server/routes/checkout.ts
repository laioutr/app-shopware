import { consola } from 'consola';
import {
  createError,
  defineEventHandler,
  getCookie,
  getQuery,
  getRequestURL,
  sendRedirect,
  useRuntimeConfig,
} from '#imports';
import { RETRY_ORDER_QUERY_KEY } from '../const/checkout';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';
import { bootstrapGuestContextToken } from '../shopware-helper/bootstrapContextToken';
import { persistContextToken } from '../shopware-helper/persistContextToken';
import { resolveCheckout } from '../shopware-helper/resolveCheckout';
import { mintSessionHandoffCode } from '../shopware-helper/sessionHandoff';

const log = consola.withTag('shopware/checkout');

/**
 * Same-origin checkout handoff route (registered at {@link CHECKOUT_ENDPOINT_PATH}).
 *
 * A cart checkout button is a plain anchor to this route. On navigation the browser
 * sends the `sw-context-token` cookie; {@link resolveCheckout} mints a single-use
 * handoff code server-to-server and this thin adapter 302s to the storefront's
 * `connect-session`, which adopts the cart context into the storefront session. The
 * fail-closed decision matrix lives in `resolveCheckout` (unit-tested); no path mutates the cart.
 *
 * A first-time visitor has no `sw-context-token` cookie yet (the cookie is only set by a cart
 * action or login). Without one, `resolveCheckout` would bounce to the laioutr root and the
 * embedded storefront would never load. So when the cookie is absent we bootstrap a guest
 * context token and persist it, giving the storefront a session to adopt (an empty guest cart).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];

  let contextToken = getCookie(event, CONTEXT_TOKEN_COOKIE);
  if (!contextToken) {
    // Best-effort: on failure leave the token unset so resolveCheckout falls back to the root.
    try {
      contextToken = await bootstrapGuestContextToken({ endpoint: config.endpoint, accessToken: config.accessToken });
      await persistContextToken(event, contextToken);
    } catch (cause) {
      log.error('Failed to bootstrap a guest context token', cause);
    }
  }

  const retryOrderId = getQuery(event)[RETRY_ORDER_QUERY_KEY];

  const plan = await resolveCheckout({
    config,
    contextToken,
    origin: getRequestURL(event).origin,
    retryOrderId: typeof retryOrderId === 'string' ? retryOrderId : null,
    mint: mintSessionHandoffCode,
  });

  if (plan.kind === 'error') {
    log.error(plan.statusMessage, plan.cause);
    throw createError({ statusCode: plan.statusCode, statusMessage: plan.statusMessage });
  }

  return sendRedirect(event, plan.url, 302);
});
