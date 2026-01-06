import { createAPIClient } from '@shopware/api-client';
import type { components, operations } from './storeApiTypes';

export type ShopwareProduct = components['schemas']['Product'];
export type ShopwareProductReview = components['schemas']['ProductReview'];
export type ShopwareCategory = components['schemas']['Category'];
export type ShopwareFilters = components['schemas']['Filters'];
export type ShopwareManufacturer = components['schemas']['ProductManufacturer'];
export type ShopwareSeoUrl = components['schemas']['SeoUrl'];
export type StorefrontClient = ReturnType<typeof createAPIClient<operations>>;
export type ShopwareCart = components['schemas']['Cart'];
export type ShopwareCartLineItem = Required<components['schemas']['CartItems']>['items'][number];

export type ShopwareIncludesQuery = components['schemas']['Include'];
export type ShopwareAssociationsQuery = components['schemas']['Association'];

export type WithSeoUrl = {
  seoUrls?: ShopwareSeoUrl[];
};

export type ShopwareExtensions = {
  extensions?: {
    completionResult?: Record<string, string>;
    multiSuggestResult?: {
      suggestResults?: {
        product_manufacturer?: { elements: Record<string, ShopwareManufacturer> };
        category?: { elements: Record<string, ShopwareCategory> };
      };
    };
  };
};
