import { consola } from 'consola';
import { createError, defineEventHandler, getCookie, getRequestURL, useRuntimeConfig } from '#imports';
import { CHECKOUT_REDIRECT_ROUTE } from '../const/checkout';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';
import { mintSessionHandoffCode } from '../shopware-helper/sessionHandoff';

const log = consola.withTag('shopware/order-handoff');

/**
 * Mint a single-use session-handoff code for the embedded checkout's top-level order submit.
 *
 * The confirm form targets `_top` so redirect-based payment providers are never framed, and
 * the storefront route it posts to redeems this code to install a session in the top-level
 * cookie jar before forwarding to Shopware's order endpoint. Codes expire in about a minute,
 * so the section re-mints while the shopper sits on the confirm page rather than once on load.
 *
 * The shopper reaches confirm through the checkout handoff, which bootstraps a context token
 * when none exists — so a missing cookie here means the session was lost, not that the
 * shopper is new. Fail rather than mint against a fresh guest cart the order would not match.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  const contextToken = getCookie(event, CONTEXT_TOKEN_COOKIE);

  if (!contextToken) {
    throw createError({ statusCode: 409, statusMessage: 'No cart context to hand off' });
  }

  const origin = getRequestURL(event).origin;

  try {
    const code = await mintSessionHandoffCode({
      endpoint: config.endpoint,
      accessToken: config.accessToken,
      contextToken,
      loginSuccessCallback: config.checkoutLoginCallbackUrl ?? origin,
      logoutSuccessCallback: config.checkoutLogoutCallbackUrl ?? origin,
      redirectRoute: CHECKOUT_REDIRECT_ROUTE,
    });

    return { code };
  } catch (cause) {
    log.error('Failed to mint an order handoff code', cause);
    throw createError({ statusCode: 502, statusMessage: 'Order handoff mint failed' });
  }
});
