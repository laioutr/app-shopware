import type { Schemas } from './storeApiTypes';

export interface ShopwareCatalogSettings {
  menuDepth: number | undefined;
  categoryPageIndex: {
    types: string[];
    minLevel: number;
    activeOnly: boolean;
  };
  seoRouteNames: {
    product: string[];
    category: string[];
  };
}

export interface ShopwareSettings {
  maxLimit: number;
  totalCountMode: Schemas['TotalCountMode'];
  loadVariantsOnListing: boolean;
  queryTemplateLimit: number;
  mediaFolderLimit: number;
  catalog: ShopwareCatalogSettings;
}
