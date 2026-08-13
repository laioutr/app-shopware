import { SHOPWARE_MAX_LIMIT } from './storeApiPageFetcher';
import type { ShopwareSettings } from '../types/settings';

export const defaultShopwareSettings = (): ShopwareSettings => ({
  maxLimit: SHOPWARE_MAX_LIMIT,
  totalCountMode: 'exact',
  loadVariantsOnListing: true,
  queryTemplateLimit: 50,
  mediaFolderLimit: 500,
  catalog: {
    menuDepth: undefined,
    categoryPageIndex: { types: ['page'], minLevel: 1, activeOnly: true },
    seoRouteNames: {
      product: ['frontend.detail.page'],
      category: ['frontend.navigation.page', 'frontend.landing.page'],
    },
  },
});
