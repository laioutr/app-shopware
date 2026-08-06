import { contextTokenCookieOptions } from './contextTokenCookie';
import { deleteManagedCookie, setManagedCookie, useNitroApp } from '#imports';
import type { H3Event } from 'h3';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

/**
 * Persist / refresh the Shopware context-token cookie (httpOnly), then notify host-registered
 * `shopware:context-token:changed` handlers so a project can mirror the token into its own
 * session store. No-op when the response carries no token.
 */
export const persistContextToken = async (event: H3Event, token: string | null | undefined): Promise<void> => {
  if (!token) return;
  setManagedCookie(event, CONTEXT_TOKEN_COOKIE, token, contextTokenCookieOptions());
  await useNitroApp().hooks.callHook('shopware:context-token:changed', { event, token });
};

/**
 * Clear the context-token cookie and notify host handlers with a null token, so a storefront
 * logout ends laioutr's mirrored session too. The next store-api call re-bootstraps a guest
 * context.
 */
export const clearContextToken = async (event: H3Event): Promise<void> => {
  deleteManagedCookie(event, CONTEXT_TOKEN_COOKIE, { path: '/' });
  await useNitroApp().hooks.callHook('shopware:context-token:changed', { event, token: null });
};
