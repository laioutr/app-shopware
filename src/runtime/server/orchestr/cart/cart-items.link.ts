import { CartItemsLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

// TODO
export default defineShopwareLink({
  implements: CartItemsLink,
  run: async ({ entityIds }) => ({ links: entityIds.map((id) => ({ sourceId: id, targetIds: [] })) }),
});
