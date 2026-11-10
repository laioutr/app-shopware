import { consola } from 'consola';
import { categoryTrailIds } from './categoryTrail';
import { createFallbackSlug, entitySlug, getEntitySeoSlug } from './mappers/slugMapper';
import { shopwareErrorStatus } from './shopwareErrors';
import { hasBreadcrumbRoute, type ShopwareVersion } from './shopwareVersion';
import { swTranslated, swTranslatedRaw } from './swTranslated';
import type { CategoryRoots } from './system/getCategoryRoots';
import type { ShopwareCategory, StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';

const logger = consola.withTag('shopware/breadcrumb');

type ShopwareBreadcrumb = Schemas['Breadcrumb'];

/** One entry of a breadcrumb as the `BreadcrumbItem` entity takes it, keyed by the id its entity gets. */
export type BreadcrumbItemData = {
  id: string;
  name: string;
  link?: { type: 'reference'; reference: { type: 'Category' | 'Product'; slug: string; id: string } } | { type: 'url'; href: string };
};

/** What decides a category's link, shared by Shopware's breadcrumb entries and its categories. */
type Linkable = { type?: string; translated?: { linkType?: string; externalLink?: string } };

/**
 * A page links to its category, a link category to its external URL; a folder, which has no page, and
 * a link to something else carry no link.
 */
const toItem = (categoryId: string, name: string, category: Linkable, slug: () => string): BreadcrumbItemData => {
  const id = `breadcrumb:${categoryId}`;

  if (category.type === 'page') {
    return { id, name, link: { type: 'reference', reference: { type: 'Category', slug: slug(), id: categoryId } } };
  }

  const externalLink = category.translated?.externalLink;
  if (category.type === 'link' && category.translated?.linkType === 'external' && externalLink) {
    return { id, name, link: { type: 'url', href: externalLink } };
  }

  return { id, name };
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

/** Map Shopware's breadcrumb onto breadcrumb items. */
export const toBreadcrumbItems = (breadcrumbs: ShopwareBreadcrumb[]): BreadcrumbItemData[] =>
  breadcrumbs.map((breadcrumb) => {
    const name = (swTranslatedRaw(breadcrumb, 'name') as string | undefined) ?? '';
    return toItem(breadcrumb.categoryId, name, breadcrumb, () => slugOf(breadcrumb, name));
  });

/**
 * Shopware's own breadcrumb for a product or category from `/breadcrumb/{id}`: the categories from
 * below the sales channel's navigation root down to the product's main category, or to the category
 * itself. `undefined`, with a warning, when the read fails, so the caller can build it another way.
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
    logger.warn(`Breadcrumb of ${type} ${id} could not be read (${reason}); building it from the category path`);
    return undefined;
  }
};

/**
 * Shopware's breadcrumb for each id, `undefined` where there is none. A release without the route is
 * not asked, so it pays no failing read per request.
 */
export const readShopwareBreadcrumbs = (
  storefrontClient: StorefrontClient,
  version: ShopwareVersion | undefined,
  ids: string[],
  type: 'product' | 'category'
): Promise<(ShopwareBreadcrumb[] | undefined)[]> =>
  hasBreadcrumbRoute(version) ?
    // One read per id: the route takes a single one.
    Promise.all(ids.map((id) => readShopwareBreadcrumb(storefrontClient, id, type)))
  : Promise.resolve(ids.map(() => undefined));

/**
 * The main category Shopware shows a product under in this sales channel. Only the detail route works
 * it out; the list route leaves `seoCategory` empty. `undefined`, with a warning, when the read fails.
 */
export const readProductMainCategoryId = async (storefrontClient: StorefrontClient, productId: string): Promise<string | undefined> => {
  try {
    const response = await storefrontClient.invoke('readProductDetail post /product/{productId}', {
      pathParams: { productId },
      body: { includes: { product: ['id', 'seoCategory'], category: ['id'] } },
    });
    return response.data.product?.seoCategory?.id;
  } catch (err) {
    const reason = shopwareErrorStatus(err) ?? (err instanceof Error ? err.message : 'unknown error');
    logger.warn(`Main category of product ${productId} could not be read (${reason}); its breadcrumb shows the product alone`);
    return undefined;
  }
};

const readCategories = async (storefrontClient: StorefrontClient, ids: string[]): Promise<ShopwareCategory[]> => {
  if (ids.length === 0) return [];

  const response = await storefrontClient.invoke('readCategoryList post /category', {
    body: {
      ids,
      associations: { seoUrls: {} },
      includes: {
        category: ['id', 'name', 'translated', 'path', 'type', 'seoUrls'],
        seo_url: ['seoPathInfo', 'isCanonical'],
      },
    },
  });

  return response.data.elements ?? [];
};

/**
 * Each category's breadcrumb built from its `path`, which works on every release: the ancestors below
 * the sales channel's root the path passes through, then the category. Links come from the SEO URLs
 * the Store API serves, the ones a slug resolves through. A category the shop does not return has no
 * trail.
 */
export const readCategoryTrails = async (
  storefrontClient: StorefrontClient,
  roots: CategoryRoots | undefined,
  categoryIds: string[]
): Promise<Map<string, BreadcrumbItemData[]>> => {
  const sources = await readCategories(storefrontClient, categoryIds);
  const trailIds = new Map(sources.map((category) => [category.id, categoryTrailIds(category, roots)]));
  const categories = new Map(sources.map((category) => [category.id, category]));

  // A path holds only ids, so the ancestors' names and slugs take a second read, shared by the batch.
  const ancestorIds = [...new Set([...trailIds.values()].flat())].filter((id) => !categories.has(id));
  for (const ancestor of await readCategories(storefrontClient, ancestorIds)) categories.set(ancestor.id, ancestor);

  return new Map(
    [...trailIds].map(([sourceId, ids]) => [
      sourceId,
      ids.flatMap((id) => {
        const category = categories.get(id);
        return category ? [toItem(category.id, swTranslated(category, 'name'), category, () => entitySlug(category))] : [];
      }),
    ])
  );
};
