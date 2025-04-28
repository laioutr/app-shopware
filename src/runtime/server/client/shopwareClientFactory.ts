import { createAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

import type { operations } from '../types/storeApiTypes';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore shopware client type is not exported
export const shopwareClientFactory = () => {
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
