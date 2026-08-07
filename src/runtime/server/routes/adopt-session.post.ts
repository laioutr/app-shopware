import { defineEventHandler, readBody, useRuntimeConfig } from '#imports';
import { adoptSessionToken } from '../shopware-helper/adoptSession';
import { clearContextToken, persistContextToken } from '../shopware-helper/persistContextToken';
import { adoptSession } from '../shopware-helper/resolveAdoptSession';

/**
 * Same-origin endpoint the embedded checkout section calls on `laioutr:auth-changed`.
 * Redeems the single-use code for the customer-bound context token (login) or clears the
 * token (logout). The token is fetched server-to-server and stored in an httpOnly cookie;
 * it never reaches the browser.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  const body = await readBody<{ code?: unknown }>(event);
  const code = typeof body?.code === 'string' ? body.code : null;

  return adoptSession({
    config: { endpoint: config.endpoint, accessToken: config.accessToken },
    code,
    adopt: adoptSessionToken,
    persist: (token) => persistContextToken(event, token),
    clear: () => clearContextToken(event),
  });
});
