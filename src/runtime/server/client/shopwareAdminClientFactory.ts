import { createAdminAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

export const shopwareAdminClientFactory = () => {
  const { adminClientId, adminClientSecret, adminEndpoint } = useRuntimeConfig()['@laioutr-app/shopware'];
  return createAdminAPIClient({
    baseURL: adminEndpoint,
    credentials: {
      grant_type: 'client_credentials',
      client_id: adminClientId,
      client_secret: adminClientSecret,
    },
  });
};
