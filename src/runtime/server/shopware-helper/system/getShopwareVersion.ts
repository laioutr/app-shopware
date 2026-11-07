import { consola } from 'consola';
import { useRuntimeConfig, useUserlandCache } from '#imports';
import type { StorefrontClient } from '../../types/shopware';
import { formatShopwareVersion, parseShopwareVersion, type ShopwareVersion } from '../shopwareVersion';

const logger = consola.withTag('shopware/version');

const VERSION_TTL = 60 * 60 * 24; // 1 day
const entryOptions = { maxAge: VERSION_TTL };
const RETRY_AFTER_MS = 5 * 60 * 1000;

const inFlight = new Map<string, Promise<ShopwareVersion | undefined>>();
const failedAt = new Map<string, number>();

/**
 * The connected shop's Shopware version, cached for a day per shop. The Store API carries it only in
 * its OpenAPI schema, which a shop can switch off; the version is then `undefined`, and the read is not
 * retried for five minutes so a shop without the schema does not pay for a failed read per request.
 */
export const getCachedShopwareVersion = async (client: StorefrontClient): Promise<ShopwareVersion | undefined> => {
  const accessToken = useRuntimeConfig()['@laioutr/app-shopware'].accessToken;
  const cache = useUserlandCache<string>(`shopware:${accessToken}:version`);
  const cached = await cache.readOne('default', entryOptions);
  if (cached && !cached.absent) return parseShopwareVersion(cached.value);

  if (Date.now() - (failedAt.get(accessToken) ?? 0) < RETRY_AFTER_MS) return undefined;

  // Concurrent first requests share one read of the schema, which runs to most of a megabyte.
  let pending = inFlight.get(accessToken);
  if (!pending) {
    pending = (async () => {
      try {
        const response = await client.invoke('api-info get /_info/openapi3.json', {});
        const raw = response.data.info?.version;
        const version = parseShopwareVersion(raw);
        if (!version) throw new Error(`unreadable version ${JSON.stringify(raw)}`);
        cache.writeOne('default', formatShopwareVersion(version), entryOptions);
        return version;
      } catch (err) {
        failedAt.set(accessToken, Date.now());
        logger.warn('Could not read the Shopware version; the app behaves as on the current release', err);
        return undefined;
      } finally {
        inFlight.delete(accessToken);
      }
    })();
    inFlight.set(accessToken, pending);
  }
  return pending;
};
