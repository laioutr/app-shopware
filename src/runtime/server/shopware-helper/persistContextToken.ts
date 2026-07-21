import { getRequestURL, setCookie, useNitroApp } from '#imports';
import type { H3Event } from 'h3';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

/**
 * Persist / refresh the Shopware context-token cookie, then notify host-registered
 * `shopware:context-token:changed` handlers so a project can mirror the token into its own
 * session store. No-op when the response carries no token; otherwise refreshes the max-age so
 * the cookie keeps reflecting the current session.
 *
 * `Secure` tracks the **frontend** request scheme — the cookie is set on the laioutr
 * domain, so it must key off the browser↔frontend connection, not the Shopware
 * store-api endpoint's scheme.
 */
export const persistContextToken = async (event: H3Event, token: string | null | undefined): Promise<void> => {
  if (!token) return;
  setCookie(event, CONTEXT_TOKEN_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
  });
  await useNitroApp().hooks.callHook('shopware:context-token:changed', { event, token });
};
