import { extractShopwareId, isShopwareId } from './isShopwareId';
import { isSlugMatchingSeoPath } from './mappers/slugMapper';
import { useUserlandCache } from '#imports';
import { StorefrontClient } from '../types/shopware';

type SeoUrlType = 'product' | 'category';

const typeToRouteNames: Record<SeoUrlType, string[]> = {
  product: ['frontend.detail.page'],
  category: ['frontend.navigation.page', 'frontend.landing.page'],
};

interface SeoEntry {
  type: SeoUrlType;
  id: string;
  matchedPath: string;
}

const SEO_ENTRY_TTL = 60 * 60 * 24; // 1 day

export const useSeoResolver = (storefrontClient: StorefrontClient) => {
  const cache = useUserlandCache<SeoEntry>('shopware/seo-urls');

  /**
   * Given an expected page-type and slug, return the best matching {@link SeoEntry}.
   * Does not return seo-entries if expected type does not match the seo-entry's type.
   */
  const resolve = async (type: SeoUrlType, slug: string): Promise<SeoEntry | undefined> => {
    const cacheKey = `${type}-${slug}`;
    const cachedSlug = await cache.getItem(cacheKey);
    if (cachedSlug) {
      return cachedSlug;
    }

    const shopwareId = extractShopwareId(slug);
    if (shopwareId) {
      return {
        type,
        id: shopwareId,
        matchedPath: slug,
      };
    }

    const response = await storefrontClient.invoke('readSeoUrl post /seo-url', {
      body: {
        filter: [
          {
            type: 'multi',
            operator: 'and',
            queries: [
              {
                type: 'multi',
                operator: 'or',
                queries: [
                  { field: 'seoPathInfo', type: 'contains', value: slug },
                  { field: 'seoPathInfo', type: 'equals', value: slug },
                ],
              },
              { field: 'routeName', type: 'equalsAny', value: typeToRouteNames[type] as any },
            ],
          },
        ],
      },
    });

    const exactMatch = response.data.elements.find((element) => element.seoPathInfo === slug);
    const bestMatch = exactMatch ?? response.data.elements.find((element) => isSlugMatchingSeoPath(slug, element.seoPathInfo));

    // In case shopware does not have a seo-url, we may return IDs directly.
    if (!bestMatch && isShopwareId(slug)) {
      return {
        type,
        id: slug,
        matchedPath: slug,
      };
    }

    if (!bestMatch) {
      return undefined;
    }

    const entry: SeoEntry = {
      type,
      id: bestMatch.foreignKey,
      matchedPath: bestMatch.seoPathInfo,
    };
    cache.setItem(cacheKey, entry, { ttl: SEO_ENTRY_TTL });
    return entry;
  };

  return {
    resolve,
  };
};
