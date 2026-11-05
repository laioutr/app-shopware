import { AddressGetAllAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readCustomerWithAddresses } from '../../shopware-helper/customerAddresses';
import { fromShopwareAddress } from '../../shopware-helper/mailingAddress';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/** The customer's addresses with their default flags, read with the customer in one call. */
export default defineShopwareAction(AddressGetAllAction, async ({ context }) => {
  const customer = await accountCall(() => readCustomerWithAddresses(context.storefrontClient));

  return {
    addresses: (customer.addresses ?? []).map((address) => ({
      id: address.id,
      address: fromShopwareAddress(address, context.systemEntities),
      isDefaultBilling: address.id === customer.defaultBillingAddressId,
      isDefaultShipping: address.id === customer.defaultShippingAddressId,
    })),
  };
});
