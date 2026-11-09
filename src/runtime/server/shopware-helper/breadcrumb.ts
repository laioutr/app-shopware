import { consola } from 'consola';
import { createFallbackSlug, getEntitySeoSlug } from './mappers/slugMapper';
import { shopwareErrorStatus } from './shopwareErrors';
import { swTranslatedRaw } from './swTranslated';
import type { StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';

const logger = consola.withTag('shopware/breadcrumb');

type ShopwareBreadcrumb = Schemas['Breadcrumb'];

/** One entry of a breadcrumb as the `BreadcrumbItem` entity takes it, keyed by the id its entity gets. */
export type BreadcrumbItemData = {
  id: string;
  name: string;
  link?: { type: 'reference'; reference: { type: 'Category' | 'Product'; slug: string; id: string } } | { type: 'url'; href: string };
};

/**
 * Shopware answers a category without an SEO URL with the technical route as its `path`, which no
 * storefront route resolves; the fallback slug does, through the id it ends in.
 */
const slugOf = (breadcrumb: ShopwareBreadcrumb, name: string): string => {
  const seoSlug = getEntitySeoSlug(breadcrumb);
  if (seoSlug) return seoSlug;
  const path = breadcrumb.path?.replace(/\/+$/, '');
  return path && !path.startsWith('navigation/') ? path : createFallbackSlug(name, breadcrumb.categoryId);
};

/**
 * Map Shopware's breadcrumb onto breadcrumb items. A page links to its category, a link category to
 * its external URL; a folder, which has no page, and a link to something else carry no link.
 */
export const toBreadcrumbItems = (breadcrumbs: ShopwareBreadcrumb[]): BreadcrumbItemData[] =>
  breadcrumbs.map((breadcrumb) => {
    const name = (swTranslatedRaw(breadcrumb, 'name') as string | undefined) ?? '';
    const id = `breadcrumb:${breadcrumb.categoryId}`;

    if (breadcrumb.type === 'page') {
      return {
        id,
        name,
        link: { type: 'reference', reference: { type: 'Category', slug: slugOf(breadcrumb, name), id: breadcrumb.categoryId } },
      };
    }

    const externalLink = breadcrumb.translated?.externalLink;
    if (breadcrumb.type === 'link' && breadcrumb.translated?.linkType === 'external' && externalLink) {
      return { id, name, link: { type: 'url', href: externalLink } };
    }

    return { id, name };
  });

/**
 * Shopware's own breadcrumb for a product or category from `/breadcrumb/{id}`: the categories from
 * below the sales channel's navigation root down to the product's main category, or to the category
 * itself. `undefined`, with a warning, when the read fails: the route is experimental and absent on
 * older releases, so the caller degrades instead of failing the page.
 */
export const readShopwareBreadcrumb = async (
  storefrontClient: StorefrontClient,
  id: string,
  type: 'product' | 'category'
): Promise<ShopwareBreadcrumb[] | undefined> => {
  try {
    const response = await storefrontClient.invoke('readBreadcrumb get /breadcrumb/{id}', { pathParams: { id }, query: { type } });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    const reason = shopwareErrorStatus(err) ?? (err instanceof Error ? err.message : 'unknown error');
    logger.warn(`Breadcrumb of ${type} ${id} could not be read (${reason}); serving a degraded one`);
    return undefined;
  }
};
