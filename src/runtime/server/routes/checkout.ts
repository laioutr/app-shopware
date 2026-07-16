import { consola } from 'consola';
import { createError, defineEventHandler, getCookie, getRequestURL, sendRedirect, useRuntimeConfig } from '#imports';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';
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
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];

  const plan = await resolveCheckout({
    config,
    contextToken: getCookie(event, CONTEXT_TOKEN_COOKIE),
    origin: getRequestURL(event).origin,
    mint: mintSessionHandoffCode,
  });

  if (plan.kind === 'error') {
    log.error(plan.statusMessage, plan.cause);
    throw createError({ statusCode: plan.statusCode, statusMessage: plan.statusMessage });
  }

  return sendRedirect(event, plan.url, 302);
});
