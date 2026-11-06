import { ProductListItemsLink } from '@laioutr-core/canonical-types/ecommerce';
import { wishlistEntryParentsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { readWishlistIfAny } from '../../shopware-helper/wishlist';

/**
 * The wishlist's entries, newest first as Shopware returns them. An entry's id is the id of the
 * product row it holds, so each Shopware product is listed at most once.
 */
export default defineShopwareLink(ProductListItemsLink, async ({ entityIds, context, pagination, passthrough }) => {
  const wishlist = await readWishlistIfAny(context.storefrontClient, { page: pagination.page, limit: pagination.limit });
  if (!wishlist || !entityIds.includes(wishlist.id)) return { links: [] };

  passthrough.set(wishlistEntryParentsToken, Object.fromEntries(wishlist.entries.map((entry) => [entry.id, entry.parentId])));

  return { links: [{ sourceId: wishlist.id, targetIds: wishlist.entries.map((entry) => entry.id), entityTotal: wishlist.total }] };
});
