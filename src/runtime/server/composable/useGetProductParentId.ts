import { useUserlandCache } from '#imports';
import { StorefrontClient } from '../types/shopware';

const useProductParentIdCache = () => useUserlandCache<string>('shopware/product-parent-id');

const PRODUCT_PARENT_ID_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

export const useGetProductParentId = (storefrontClient: StorefrontClient) => {
  const cache = useProductParentIdCache();

  /** Given a variant-id, return the parent-id. Returns undefined if no parent-id is found. */
  return async (id: string) => {
    const cachedParentId = await cache.getItem(id);
    if (cachedParentId) {
      return cachedParentId;
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
        cache.setItem(id, parentId, { ttl: PRODUCT_PARENT_ID_CACHE_TTL });
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
  const cache = useProductParentIdCache();
  cache.setItems(
    productIdsToParentIds.map(([productId, parentId]) => ({
      key: productId,
      value: parentId,
    })),
    { ttl: PRODUCT_PARENT_ID_CACHE_TTL }
  );
};
