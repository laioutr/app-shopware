import { consola } from 'consola';
import { defineEventHandler, getQuery, sendRedirect, useRuntimeConfig } from '#imports';
import { adoptSessionToken } from '../shopware-helper/adoptSession';
import { clearContextToken, persistContextToken } from '../shopware-helper/persistContextToken';
import { adoptSession } from '../shopware-helper/resolveAdoptSession';
import { resolveReturnTo } from '../shopware-helper/resolveReturnTo';

const log = consola.withTag('shopware/adopt-session');

/**
 * Landing route for the storefront's auth bounce in redirect checkout mode.
 *
 * Shopware rotates the context token on login, register and guest checkout, and redirecting puts
 * that in a cookie jar laioutr cannot read. So the storefront sends the browser here with a
 * single-use code, redeemed server-to-server into an httpOnly cookie — the token never reaches
 * the browser — before bouncing the shopper back to where they were.
 *
 * The code is consumed by this request and deliberately left out of the redirect: it is
 * single-use, and one still sitting in the address bar gets replayed on reload.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  const query = getQuery(event);
  const code = typeof query.code === 'string' ? query.code : null;

  try {
    await adoptSession({
      config: { endpoint: config.endpoint, accessToken: config.accessToken },
      code,
      adopt: adoptSessionToken,
      persist: (token) => persistContextToken(event, token),
      clear: () => clearContextToken(event),
    });
  } catch (cause) {
    // Stranding a shopper mid-checkout is worse than reading them as logged out, which is the
    // whole cost of a failed redeem.
    log.warn('Failed to adopt the storefront session on the auth bounce', cause);
  }

  return sendRedirect(event, resolveReturnTo(query['return-to'], config.storefrontUrl), 302);
});
