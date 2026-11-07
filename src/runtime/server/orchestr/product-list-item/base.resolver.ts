import { ProductListItemBase } from '@laioutr-core/canonical-types/entity/product-list-item';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';

/**
 * A Shopware wishlist entry is bare product membership — no quantity, note or date — so its base is
 * empty and everything a tile renders comes through the product and variant links.
 */
export default defineShopwareComponentResolver({
  entityType: 'ProductListItem',
  label: 'Shopware Wishlist Item Component Resolver',
  provides: [ProductListItemBase],
  resolve: async ({ entityIds, $entity }) => ({
    entities: entityIds.map((id) => $entity({ id, base: () => ({}) })),
  }),
});
