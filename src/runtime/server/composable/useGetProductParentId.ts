import { useUserlandCache } from '#imports';
import { StorefrontClient } from '../types/shopware';

const useProductParentIdCache = () => useUserlandCache<string>('shopware/product-parent-id');

const PRODUCT_PARENT_ID_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
const entryOptions = { maxAge: PRODUCT_PARENT_ID_CACHE_TTL };

export const useGetProductParentId = (storefrontClient: StorefrontClient) => {
  const cache = useProductParentIdCache();

  /** Given a variant-id, return the parent-id. Returns undefined if no parent-id is found. */
  return async (id: string) => {
    const cached = await cache.readOne(id, entryOptions);
    if (cached && !cached.absent) {
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
      return undefined;
    } catch {
      return undefined;
    }
  };
};

/** Store parent-ids in the cache. */
export const cacheProductParentIds = (productIdsToParentIds: [productId: string, parentId: string][]) => {
  useProductParentIdCache().write(
    productIdsToParentIds.map(([productId, parentId]) => ({
      key: productId,
      value: parentId,
      options: entryOptions,
    }))
  );
};
