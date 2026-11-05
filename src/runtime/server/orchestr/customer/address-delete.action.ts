import { CustomerAddressDeleteAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/**
 * Delete an address. Shopware refuses to delete a default address (`CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT`)
 * and there is no canonical error for it, so that refusal reaches the caller as Shopware raised it.
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
