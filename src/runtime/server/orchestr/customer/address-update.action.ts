import { AddressNotFoundError, CustomerAddressUpdateAction } from '@laioutr-core/canonical-types/ecommerce';
import type { Schemas } from '../../types/storeApiTypes';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { listCustomerAddresses } from '../../shopware-helper/customerAddresses';
import { mergeShopwareAddressBody, resolveAddressIds } from '../../shopware-helper/mailingAddress';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/**
 * Update an address. Shopware validates the whole address on every write, so the input is overlaid
 * on the stored address rather than sent as the partial it is.
 */
export default defineShopwareAction(CustomerAddressUpdateAction, async ({ context, input }) => {
  const { storefrontClient, systemEntities } = context;
  const addressId = input.id;

  const [stored] = await accountCall(() => listCustomerAddresses(storefrontClient, addressId), { addressId });
  if (!stored) throw new AddressNotFoundError(addressId);

  // A province on its own is resolved against the stored country.
  const storedCountryCode = systemEntities.countries.find((country) => country.id === stored.countryId)?.iso;
  const countryCode = input.address.countryCode ?? (input.address.provinceCode ? storedCountryCode : undefined);
  const ids = await resolveAddressIds(
    storefrontClient,
    systemEntities,
    { ...input.address, countryCode },
    {
      fieldPrefix: ['address'],
      complete: false,
    }
  );
  const body = mergeShopwareAddressBody(stored, input.address, ids) as Schemas['CustomerAddressBody'];

  await accountCall(
    () => storefrontClient.invoke('updateCustomerAddress patch /account/address/{addressId}', { pathParams: { addressId }, body }),
    {
      addressId,
      fieldPrefix: ['address'],
    }
  );
});
