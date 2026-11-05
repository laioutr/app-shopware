import { CustomerAddressSetDefaultAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { accountCall } from '../../shopware-helper/shopwareErrors';

export default defineShopwareAction(CustomerAddressSetDefaultAction, async ({ context, input }) => {
  const { storefrontClient } = context;
  const addressId = input.id;
  const pathParams = { addressId };

  await accountCall(
    () =>
      input.type === 'billing' ?
        storefrontClient.invoke('defaultBillingAddress patch /account/address/default-billing/{addressId}', { pathParams })
      : storefrontClient.invoke('defaultShippingAddress patch /account/address/default-shipping/{addressId}', { pathParams }),
    { addressId }
  );
});
