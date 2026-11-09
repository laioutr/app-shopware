import { ShopwareCustomerDeleteAction } from '../../../shared/tokens/customer';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { clearContextToken } from '../../shopware-helper/persistContextToken';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/**
 * Delete the customer through `DELETE /account/customer`, then drop the context token as a logout
 * does: the token still names a customer who no longer exists, and a host that mirrors it per
 * identity is told the session ended.
 */
export default defineShopwareAction(ShopwareCustomerDeleteAction, async ({ context, event }) => {
  await accountCall(() => context.storefrontClient.invoke('deleteCustomer delete /account/customer'));
  await clearContextToken(event);
});
