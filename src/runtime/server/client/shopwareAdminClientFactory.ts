import { createAdminAPIClient } from '@shopware/api-client';
import { useRuntimeConfig } from '#imports';

export type ShopwareAdminClient = ReturnType<typeof createAdminAPIClient>;

type AdminSession = ReturnType<ShopwareAdminClient['getSessionData']>;

// Shopware verifies the integration secret with bcrypt and writes the integration row for every token it issues,
// so the token is kept for the process, per integration, until it expires.
const sessions = new Map<string, AdminSession>();

// Shopware client type is not exported
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: ignore not portable type TS2742
export const shopwareAdminClientFactory = (): ShopwareAdminClient => {
  const { adminClientId, adminClientSecret, adminEndpoint } = useRuntimeConfig()['@laioutr/app-shopware'];
  const integration = `${adminEndpoint} ${adminClientId}`;

  const client = createAdminAPIClient({
    baseURL: adminEndpoint,
    credentials: {
      grant_type: 'client_credentials',
      client_id: adminClientId,
      client_secret: adminClientSecret,
    },
    sessionData: sessions.get(integration),
  });
  client.hook('onAuthChange', (session) => {
    sessions.set(integration, session);
  });
  return client;
};
