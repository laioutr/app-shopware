import slug from 'slug';
import { ShopwareCategory, ShopwareProduct, ShopwareSeoUrl, WithSeoUrl } from '../../types/shopware';
import { swTranslated } from '../swTranslated';

const extractSlugFromPath = (path: string): string => path; // .split('/').slice(1).join('/').toLowerCase();

const seoUrlToSlug = (seoUrl: ShopwareSeoUrl): string => extractSlugFromPath(seoUrl.seoPathInfo);

/** Determine whether a given slug matches a seoPath */
export const isSlugMatchingSeoPath = (slug: string, seoPath: string) => extractSlugFromPath(seoPath) === slug.toLowerCase();

/** Map a generic entity with seoUrls to a slug */
export const getEntitySeoSlug = (rawEntity: WithSeoUrl): string | undefined =>
  rawEntity.seoUrls && rawEntity.seoUrls.length > 0 ? seoUrlToSlug(rawEntity.seoUrls[0]) : undefined;

export const createFallbackSlug = (name: string, id: string) => `${slug(name)}-${id}`;

/** Get slug of a product. Falls back to sluggified name if no seoUrl is available */
export const entitySlug = (rawEntity: ShopwareProduct | ShopwareCategory): string =>
  getEntitySeoSlug(rawEntity) ?? createFallbackSlug(swTranslated(rawEntity, 'name'), rawEntity.id);
