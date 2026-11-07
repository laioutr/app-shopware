import { ProductListAddItemsAction, ProductListNotFoundError, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { isCustomerNotLoggedIn, readWishlist, wishlistProductId } from '../../shopware-helper/wishlist';

/**
 * Add products to the customer's wishlist through `/customer/wishlist/merge`, which creates the
 * wishlist on first use and skips products already on it. That makes the call idempotent, so a
 * storefront can keep a guest's list locally and replay it with this action once the visitor logs in.
 *
 * Each item is stored as its variant when it names one. A Shopware wishlist entry carries no
 * quantity, note or custom fields, so those are not kept.
 */
export default defineShopwareAction(ProductListAddItemsAction, async ({ context, input }) => {
  const { storefrontClient } = context;

  if (input.productListId !== undefined) {
    const wishlist = await readWishlist(storefrontClient, { page: 1, limit: 1 });
    if (wishlist?.id !== input.productListId) throw new ProductListNotFoundError(input.productListId);
  }

  if (input.items.length === 0) return;

  try {
    await storefrontClient.invoke('mergeProductOnWishlist post /customer/wishlist/merge', {
      body: { productIds: [...new Set(input.items.map(wishlistProductId))] },
    });
  } catch (err) {
    if (isCustomerNotLoggedIn(err)) throw new UnauthenticatedError();
    throw err;
  }
});
