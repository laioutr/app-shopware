import { CartAddItemsAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';

export default defineShopwareAction(CartAddItemsAction, async ({ input, context }) => {
  // TODO implement
  await new Promise((resolve) => setTimeout(resolve, 150));
});
