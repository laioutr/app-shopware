import { OrchestrArgsBase } from '#orchestr/types/builder/Args';
import { createAPIClient } from '@shopware/api-client';
import { getCookie, setCookie, useRuntimeConfig } from '#imports';
import type { StorefrontClient } from '../types/shopware';
import type { operations } from '../types/storeApiTypes';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareClientFactory = (event: OrchestrArgsBase['event']): StorefrontClient => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];

  const client = createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
    contextToken: getCookie(event, CONTEXT_TOKEN_COOKIE),
  });

  client.hook('onContextChanged', (newContextToken) => {
    setCookie(event, CONTEXT_TOKEN_COOKIE, newContextToken, {
      maxAge: 365, // days
      path: '/',
      sameSite: 'lax',
      secure: config.endpoint.startsWith('https://'),
    });
  });

  client.defaultHeaders.apply({
    'sw-include-seo-urls': 'true',
  });

  return client;
};
