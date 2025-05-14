import type { components } from './storeApiTypes';

export type ShopwareProduct = components['schemas']['Product'];
export type ShopwareManufacturer = components['schemas']['ProductManufacturer'];
export type ShopwareSeoUrl = components['schemas']['SeoUrl'];

export type WithSeoUrl = {
  seoUrls?: ShopwareSeoUrl[];
};
