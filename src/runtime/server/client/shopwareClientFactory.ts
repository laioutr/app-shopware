import { OrchestrArgsBase } from '#orchestr/types/builder/Args';
import { createAPIClient } from '@shopware/api-client';
import { getCookie, useRuntimeConfig } from '#imports';
import type { StorefrontClient } from '../types/shopware';
import type { operations } from '../types/storeApiTypes';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareClientFactory = (event: OrchestrArgsBase['event']): StorefrontClient => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  
  const contextTokenCookie = getCookie(event, CONTEXT_TOKEN_COOKIE);

  const client = createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
    contextToken: contextTokenCookie,
  });

  client.defaultHeaders.apply({
    'sw-include-seo-urls': 'true',
  });

  return client;
};
