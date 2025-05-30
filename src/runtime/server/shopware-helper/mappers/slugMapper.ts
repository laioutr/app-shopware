import slug from 'slug';
import { ShopwareProduct, ShopwareSeoUrl, WithSeoUrl } from '../../types/shopware';
import { swTranslated } from '../swTranslated';

const extractSlugFromPath = (path: string): string => path.split('/').at(-1)!.toLowerCase();

const seoUrlToSlug = (seoUrl: ShopwareSeoUrl): string => extractSlugFromPath(seoUrl.seoPathInfo);

/** Determine whether a given slug matches a seoPath */
export const isSlugMatchingSeoPath = (slug: string, seoPath: string) => extractSlugFromPath(seoPath) === slug.toLowerCase();

/** Map a generic entity with seoUrls to a slug */
export const entityToSlug = (rawEntity: WithSeoUrl): string | undefined =>
  rawEntity.seoUrls && rawEntity.seoUrls.length > 0 ? seoUrlToSlug(rawEntity.seoUrls[0]) : undefined;

/** Get slug of a product. Falls back to sluggified name if no seoUrl is available */
export const productToSlug = (rawProduct: ShopwareProduct): string => entityToSlug(rawProduct) ?? slug(swTranslated(rawProduct, 'name'));
