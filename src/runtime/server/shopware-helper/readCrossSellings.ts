import { consola } from 'consola';
import { type CrossSellingGroup, mapCrossSellingElements } from './crossSelling';
import { mapWithConcurrency } from './mapWithConcurrency';
import { useRuntimeConfig, useUserlandCache } from '#imports';
import type { StorefrontClient } from '../types/shopware';

const logger = consola.withTag('shopware/cross-selling');

// The groups are merchandising that rarely changes, but a stream's products drop out as they sell out,
// so the window matches the variants link's rather than the day a slug is kept.
const CROSS_SELLING_TTL = 60 * 10;
const entryOptions = { maxAge: CROSS_SELLING_TTL };

// The route answers one product per call. A product page asks for one; a listing that links every
// tile asks for a page of them, which must not open a page's worth of connections to the shop at once.
const MAX_PARALLEL_READS = 4;

const includes = {
  cross_selling_element: ['crossSelling', 'products'],
  product_cross_selling: ['id', 'name', 'position', 'type', 'active', 'translated'],
  product: ['id', 'parentId'],
};

const inFlight = new Map<string, Promise<CrossSellingGroup[] | undefined>>();

/**
 * The cross-selling groups of each product id, read from `/product/{productId}/cross-selling`. Shopware
 * resolves a variant's inherited groups itself, so a variant id is asked as it is.
 *
 * Cached per product, language and currency. Orchestr's own link cache is not used for this: it keeps
 * a link's edges but not the request's passthrough, and the product resolver needs the passthrough to
 * show each linked product's variant. A product whose read fails is missing from the answer, with a
 * warning, and is not cached.
 */
export const readCrossSellings = async (
  storefrontClient: StorefrontClient,
  productIds: string[]
): Promise<Map<string, CrossSellingGroup[]>> => {
  const accessToken = useRuntimeConfig()['@laioutr/app-shopware'].accessToken;
  const cache = useUserlandCache<CrossSellingGroup[]>(`shopware:${accessToken}:cross-selling`);
  const languageId = storefrontClient.defaultHeaders['sw-language-id'] ?? 'default';
  const currencyId = storefrontClient.defaultHeaders['sw-currency-id'] ?? 'default';

  const readOne = async (productId: string): Promise<CrossSellingGroup[] | undefined> => {
    const key = `${languageId}:${currencyId}:${productId}`;
    const cached = await cache.readOne(key, entryOptions);
    if (cached && !cached.absent) return cached.value;

    // Two links on one page ask for the same product at once; they share the read.
    const flightKey = `${accessToken}:${key}`;
    let pending = inFlight.get(flightKey);
    if (!pending) {
      pending = (async () => {
        try {
          const response = await storefrontClient.invoke('readProductCrossSellings post /product/{productId}/cross-selling', {
            pathParams: { productId },
            // The typed client knows no body for this route, but Shopware reads `includes` on every route.
            body: { includes },
          } as { pathParams: { productId: string } });
          const groups = mapCrossSellingElements(response.data);
          cache.writeOne(key, groups, entryOptions);
          return groups;
        } catch (error) {
          logger.warn(`Cross-selling of product ${productId} could not be read; it links no cross-selling.`, error);
          return undefined;
        }
      })().finally(() => inFlight.delete(flightKey));
      inFlight.set(flightKey, pending);
    }
    return pending;
  };

  const uniqueIds = [...new Set(productIds)];
  const answers = await mapWithConcurrency(uniqueIds, MAX_PARALLEL_READS, readOne);

  const groupsById = new Map<string, CrossSellingGroup[]>();
  uniqueIds.forEach((productId, index) => {
    const groups = answers[index];
    if (groups) groupsById.set(productId, groups);
  });
  return groupsById;
};
