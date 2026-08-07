import { OrchestrArgsBase } from '#orchestr/types/builder/Args';
import { createAPIClient } from '@shopware/api-client';
import { getCookie, useNitroApp, useRuntimeConfig } from '#imports';
import type { StorefrontClient } from '../types/shopware';
import type { operations } from '../types/storeApiTypes';
import { CONTEXT_TOKEN_COOKIE } from '../const/cookieKeys';

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareClientFactory = async (event: OrchestrArgsBase['event']): Promise<StorefrontClient> => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];

  // A host may supply the context token from its own session store (bail hook); the cookie is
  // the fallback. This is a cheap read only — it must never mint a token (see the design doc).
  const resolved: { token?: string } = {};
  await useNitroApp().hooks.callHook('shopware:context-token:resolve', { event, result: resolved });
  const contextToken = resolved.token ?? getCookie(event, CONTEXT_TOKEN_COOKIE);

  const client = createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
    contextToken,
  });

  client.defaultHeaders.apply({
    'sw-include-seo-urls': 'true',
  });

  return client;
};
