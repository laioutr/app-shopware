import { createAPIClient } from '@shopware/api-client';
import type { components, operations } from './storeApiTypes';

export type ShopwareProduct = components['schemas']['Product'];
export type ShopwareCategory = components['schemas']['Category'];
export type ShopwareManufacturer = components['schemas']['ProductManufacturer'];
export type ShopwareSeoUrl = components['schemas']['SeoUrl'];
export type StorefrontClient = ReturnType<typeof createAPIClient<operations>>;

export type WithSeoUrl = {
  seoUrls?: ShopwareSeoUrl[];
};
