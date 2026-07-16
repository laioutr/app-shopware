import { consola } from 'consola';
import { createError, defineEventHandler, getCookie, getRequestURL, sendRedirect, useRuntimeConfig } from '#imports';
import { CHECKOUT_REDIRECT_ROUTE } from '../const/checkout';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';
import { buildConnectSessionUrl } from '../shopware-helper/checkoutUrl';
import { mintSessionHandoffCode } from '../shopware-helper/sessionHandoff';

const log = consola.withTag('shopware/checkout');

/**
 * Same-origin checkout handoff route (registered at {@link CHECKOUT_ENDPOINT_PATH}).
 *
 * A cart checkout button is a plain anchor to this route. On navigation the browser
 * sends the `sw-context-token` cookie; this handler mints a single-use handoff code
 * server-to-server and 302s to the storefront's `connect-session`, which adopts the
 * cart context into the storefront session. Fail-closed: no path mutates the cart.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];

  if (!config.storefrontUrl) {
    log.error('checkout handoff requested but storefrontUrl is not configured');
    throw createError({ statusCode: 500, statusMessage: 'Checkout is not configured' });
  }

  const contextToken = getCookie(event, CONTEXT_TOKEN_COOKIE);
  if (!contextToken) {
    // No cart context yet — nothing to hand off; send the shopper to the storefront.
    return sendRedirect(event, config.storefrontUrl.replace(/\/+$/, ''), 302);
  }

  const origin = getRequestURL(event).origin;

  try {
    const code = await mintSessionHandoffCode({
      endpoint: config.endpoint,
      accessToken: config.accessToken,
      contextToken,
      loginSuccessCallback: origin,
      logoutSuccessCallback: origin,
      redirectRoute: CHECKOUT_REDIRECT_ROUTE,
    });

    return sendRedirect(event, buildConnectSessionUrl({ storefrontUrl: config.storefrontUrl, code }), 302);
  } catch (err) {
    log.error('session-handoff mint failed', err);
    throw createError({ statusCode: 502, statusMessage: 'Checkout handoff failed' });
  }
});
