import type { ClientHeaders } from '../types/shopware';

interface AdminCredentials {
  adminEndpoint?: string;
  adminClientId?: string;
  adminClientSecret?: string;
}

export const isAdminConfigured = ({ adminEndpoint, adminClientId, adminClientSecret }: AdminCredentials) =>
  !!adminEndpoint && !!adminClientId && !!adminClientSecret;

/**
 * Snapshot of a client's default headers as a plain record, for a request the typed client cannot
 * make — a plugin route is not in its operation map. The proxy also carries an `apply` method, and
 * a header the client cleared is left in place as `undefined`.
 */
export const toStoreApiHeaders = (defaultHeaders: ClientHeaders): Record<string, string> =>
  Object.fromEntries(
    Object.entries(defaultHeaders).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
  );
