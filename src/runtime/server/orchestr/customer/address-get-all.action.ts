import { AddressGetAllAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readCustomerWithAddresses, toAddressBookEntries } from '../../shopware-helper/customerAddresses';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/** The customer's addresses with their default flags, read with the customer in one call. */
export default defineShopwareAction(AddressGetAllAction, async ({ context }) => {
  const customer = await accountCall(() => readCustomerWithAddresses(context.storefrontClient));

  return { addresses: toAddressBookEntries(customer, context.systemEntities) };
});
