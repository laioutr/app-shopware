import { createAdminAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

type ShopwareAdminClient = ReturnType<typeof createAdminAPIClient>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore shopware client type is not exported
export const shopwareAdminClientFactory = (): ShopwareAdminClient => {
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
