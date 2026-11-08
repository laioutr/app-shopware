import { CustomerAddressDeleteAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/**
 * Delete an address. Shopware refuses to delete a default address (`CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT`)
 * and, before 6.7.3, the address active in the current context (`CHECKOUT__CUSTOMER_ADDRESS_IS_ACTIVE`);
 * both reach the caller as `AddressNotDeletableError`.
 */
export default defineShopwareAction(CustomerAddressDeleteAction, async ({ context, input }) => {
  const addressId = input.id;

  await accountCall(
    () => context.storefrontClient.invoke('deleteCustomerAddress delete /account/address/{addressId}', { pathParams: { addressId } }),
    {
      addressId,
    }
  );
});
