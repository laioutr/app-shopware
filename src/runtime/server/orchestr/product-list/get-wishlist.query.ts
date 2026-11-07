import { ProductListGetWishlistQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { readWishlistIfAny } from '../../shopware-helper/wishlist';

/** The current customer's wishlist. A guest, and a customer who has never added a product, have none. */
export default defineShopwareQuery(ProductListGetWishlistQuery, async ({ context, notFound }) => {
  const wishlist = await readWishlistIfAny(context.storefrontClient, { page: 1, limit: 1 });
  return wishlist ? { id: wishlist.id } : notFound();
});
