import { isCustomerNotLoggedIn, shopwareErrorCodes } from './shopwareErrors';
import { UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import type { StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';

/** One entry on a Shopware wishlist: the product row it holds, a variant or a product without any. */
export type WishlistEntry = { id: string; parentId?: string };

/** A page of the current customer's wishlist. `id` is the customer's id: Shopware keeps one wishlist per customer. */
export type WishlistPage = { id: string; entries: WishlistEntry[]; total: number };

/** A customer who has never added a product has no wishlist yet; Shopware creates it on the first add. */
export const isWishlistNotFound = (err: unknown) => shopwareErrorCodes(err).includes('CHECKOUT__WISHLIST_NOT_FOUND');

type ReadOptions = { page: number; limit: number; filter?: Schemas['Criteria']['filter'] };

/**
 * Read a page of the current customer's wishlist, projected to the ids its entries need. Answers
 * `undefined` for a customer without a wishlist and throws {@link UnauthenticatedError} for a guest.
 */
export const readWishlist = async (client: StorefrontClient, { page, limit, filter }: ReadOptions): Promise<WishlistPage | undefined> => {
  try {
    const response = await client.invoke('readCustomerWishlist post /customer/wishlist', {
      body: { page, limit, ...(filter ? { filter } : {}), 'total-count-mode': 'exact', includes: { product: ['id', 'parentId'] } },
    });
    const { products, wishlist } = response.data;
    if (!wishlist?.customerId) return undefined;

    return {
      id: wishlist.customerId,
      entries: (products.elements ?? []).map((product) => ({
        id: product.id,
        ...(product.parentId ? { parentId: product.parentId } : {}),
      })),
      total: products.total ?? products.elements?.length ?? 0,
    };
  } catch (err) {
    if (isCustomerNotLoggedIn(err)) throw new UnauthenticatedError();
    if (isWishlistNotFound(err)) return undefined;
    throw err;
  }
};

/** {@link readWishlist} for reads that render a list: a guest has none to show, which is no error. */
export const readWishlistIfAny = async (client: StorefrontClient, options: ReadOptions): Promise<WishlistPage | undefined> => {
  try {
    return await readWishlist(client, options);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return undefined;
    throw err;
  }
};

/**
 * The product row a canonical list item names. A wishlist entry is a single Shopware product, so a
 * named variant is stored as given and a bare product id stands for the product itself.
 */
export const wishlistProductId = (item: { productId: string; variantId?: string }) => item.variantId ?? item.productId;

/**
 * The entries a removal names. A variant is removed exactly; a bare product id removes the product's
 * own entry and every entry for one of its variants, since a listing-page toggle knows only the product.
 */
export const entriesToRemove = (entries: WishlistEntry[], item: { productId: string; variantId?: string }): string[] =>
  item.variantId ?
    entries.filter((entry) => entry.id === item.variantId).map((entry) => entry.id)
  : entries.filter((entry) => entry.id === item.productId || entry.parentId === item.productId).map((entry) => entry.id);
