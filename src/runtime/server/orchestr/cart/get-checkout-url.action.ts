import { GetCheckoutUrlAction } from '@laioutr-core/canonical-types/ecommerce';
import { CHECKOUT_ENDPOINT_PATH } from '../../const/checkout';
import { defineShopwareAction } from '../../middleware/defineShopware';

/**
 * Returns the stable, same-origin checkout URL. The single-use session-handoff code
 * is minted server-side when the browser navigates to this route (see
 * `server/routes/checkout.ts`), so the URL itself is safe to render and cache.
 *
 * This mirrors the `checkoutLink` on the Cart component resolver — both resolve to
 * {@link CHECKOUT_ENDPOINT_PATH}.
 */
export default defineShopwareAction(GetCheckoutUrlAction, async () => ({
  checkoutUrl: CHECKOUT_ENDPOINT_PATH,
}));
