import { ProductListBase } from '@laioutr-core/canonical-types/entity/product-list';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { readWishlistIfAny } from '../../shopware-helper/wishlist';

/** Shopware has one list per customer, its wishlist, so the only list this resolves is the current customer's. */
export default defineShopwareComponentResolver({
  entityType: 'ProductList',
  label: 'Shopware Wishlist Component Resolver',
  provides: [ProductListBase],
  resolve: async ({ entityIds, context, $entity }) => {
    const wishlist = await readWishlistIfAny(context.storefrontClient, { page: 1, limit: 1 });

    return {
      entities:
        wishlist && entityIds.includes(wishlist.id) ?
          [$entity({ id: wishlist.id, base: () => ({ type: 'wishlist', itemCount: wishlist.total }) })]
        : [],
      notFound: entityIds.filter((id) => id !== wishlist?.id),
    };
  },
});
