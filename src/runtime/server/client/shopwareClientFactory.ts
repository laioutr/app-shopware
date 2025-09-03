import { OrchestrArgsBase } from '#orchestr/types/builder/Args';
import { createAPIClient } from '@shopware/api-client';
import { getCookie, setCookie, useRuntimeConfig } from '#imports';
import type { StorefrontClient } from '../types/shopware';
import type { operations } from '../types/storeApiTypes';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

// Global variable to use for storing context token upon triggering shopware api client `onContextChanged` hook
// Can't set cookie directly at that time beause by that time response headers are already sent out
const globalWithContextToken: typeof globalThis & { contextToken?: string } = globalThis;
globalWithContextToken.contextToken = '';

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareClientFactory = (event: OrchestrArgsBase['event']): StorefrontClient => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];

  const contextTokenCookie = getCookie(event, CONTEXT_TOKEN_COOKIE);

  // Update global runetime variable from persistent cookie if found
  if (contextTokenCookie) globalWithContextToken.contextToken = contextTokenCookie;

  // Set persistent cookie if a context token exists
  if (globalWithContextToken.contextToken) {
    setCookie(event, CONTEXT_TOKEN_COOKIE, globalWithContextToken.contextToken, {
      maxAge: 365, // days
      path: '/',
      sameSite: 'lax',
      secure: config.endpoint.startsWith('https://'),
    });
  }

  const client = createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
    contextToken: globalWithContextToken.contextToken,
  });

  client.hook('onContextChanged', (newContextToken) => {
    globalWithContextToken.contextToken = newContextToken;
  });

  client.defaultHeaders.apply({
    'sw-include-seo-urls': 'true',
  });

  return client;
};
