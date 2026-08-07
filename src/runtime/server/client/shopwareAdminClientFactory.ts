import { createAdminAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

type ShopwareAdminClient = ReturnType<typeof createAdminAPIClient>;

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareAdminClientFactory = (): ShopwareAdminClient => {
  const { adminClientId, adminClientSecret, adminEndpoint } = useRuntimeConfig()['@laioutr/app-shopware'];
  return createAdminAPIClient({
    baseURL: adminEndpoint,
    credentials: {
      grant_type: 'client_credentials',
      client_id: adminClientId,
      client_secret: adminClientSecret,
    },
  });
};
