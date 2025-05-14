import slug from 'slug';
import { ShopwareProduct, ShopwareSeoUrl, WithSeoUrl } from '../../types/shopware';
import { swTranslated } from '../swTranslated';

const seoUrlToSlug = (seoUrl: ShopwareSeoUrl): string => seoUrl.seoPathInfo.split('/').at(-1)!.toLowerCase();

/** Map a generic entity with seoUrls to a slug */
export const entityToSlug = (rawEntity: WithSeoUrl): string | undefined =>
  rawEntity.seoUrls && rawEntity.seoUrls.length > 0 ? seoUrlToSlug(rawEntity.seoUrls[0]) : undefined;

/** Get slug of a product. Falls back to sluggified name if no seoUrl is available */
export const productToSlug = (rawProduct: ShopwareProduct): string => entityToSlug(rawProduct) ?? slug(swTranslated(rawProduct, 'name'));
