import { createAPIClient } from '@shopware/api-client';
import { operations } from '../types/storeApiTypes';

export const shopwareClientFactory = () => {
  const config = useRuntimeConfig()['@laioutr/shopware'];
  return createAPIClient<operations>({
    baseURL: config.endpoint,
    accessToken: config.accessToken,
  });
};
