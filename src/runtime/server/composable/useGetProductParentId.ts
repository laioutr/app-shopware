import { useUserlandCache } from '#imports';
import { ABSENT } from '@laioutr-core/orchestr/types';
import { StorefrontClient } from '../types/shopware';

const useProductParentIdCache = () => useUserlandCache<string>('shopware/product-parent-id');

const PRODUCT_PARENT_ID_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

// Only a data-model change turns a top-level product into a variant, so a cached absence earns the
// same window as a cached parent id rather than the store's five-minute default.
const entryOptions = {
  maxAge: PRODUCT_PARENT_ID_CACHE_TTL,
  absentMaxAge: PRODUCT_PARENT_ID_CACHE_TTL,
};

export const useGetProductParentId = (storefrontClient: StorefrontClient) => {
  const cache = useProductParentIdCache();

  /** Given a variant-id, return the parent-id. Returns undefined if no parent-id is found. */
  return async (id: string) => {
    // An absent hit carries `undefined`, which is the answer for a top-level product.
    const cached = await cache.readOne(id, entryOptions);
    if (cached) {
      return cached.value;
    }

    try {
      const response = await storefrontClient.invoke('readProduct post /product', {
        body: {
          ids: [id],
          includes: { product: ['id', 'parentId'] },
        },
      });

      const parentId = response.data.elements?.[0]?.parentId;
      if (parentId) {
        cache.writeOne(id, parentId, entryOptions);
        return parentId;
      }
      cache.writeOne(id, ABSENT, entryOptions);
      return undefined;
    } catch {
      // A failed read is "unknown", not "no parent", so it leaves the cache alone.
      return undefined;
    }
  };
};

/** Store parent-ids in the cache. A product with no parent is stored as a cached absence. */
export const cacheProductParentIds = (productIdsToParentIds: [productId: string, parentId: string | undefined][]) => {
  useProductParentIdCache().write(
    productIdsToParentIds.map(([productId, parentId]) => ({
      key: productId,
      value: parentId ?? ABSENT,
      options: entryOptions,
    }))
  );
};
