import { createAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

import type { StorefrontClient } from '../types/shopware';
import type { operations } from '../types/storeApiTypes';

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareClientFactory = (): StorefrontClient => {
  const config = useRuntimeConfig()['@laioutr-app/shopware'];
  const client = createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
  });

  client.defaultHeaders.apply({
    'sw-include-seo-urls': 'true',
  });

  return client;
};
