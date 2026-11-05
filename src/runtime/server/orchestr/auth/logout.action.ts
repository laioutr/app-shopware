import { AuthLogoutAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { clearContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorStatus } from '../../shopware-helper/shopwareErrors';

/**
 * Log the customer out of their Shopware context and drop the context token, the same way a logout
 * inside the embedded checkout does. The next Store API call starts a fresh guest context.
 *
 * Shopware may answer the logout with a new guest token, but persisting it would hand a host that
 * mirrors the token per identity a guest token for a session it is ending; clearing notifies it with
 * `null` instead.
 */
export default defineShopwareAction(AuthLogoutAction, async ({ context, event }) => {
  try {
    await context.storefrontClient.invoke('logoutCustomer post /account/logout');
  } catch (err) {
    // A context with no customer answers 403; it is logged out already.
    if (shopwareErrorStatus(err) !== 403) throw err;
  }

  await clearContextToken(event);
});
