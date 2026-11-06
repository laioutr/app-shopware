import { CustomerGetCurrentAction, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readCustomerWithAddresses } from '../../shopware-helper/customerAddresses';
import { fromShopwareAddress } from '../../shopware-helper/mailingAddress';

/**
 * Read the customer behind the request's context token, addresses included, in one Store API call.
 * Shopware answers `403` when the token belongs to a guest context, which is the signal callers use
 * to tell a session from none.
 *
 * Shopware keeps phone numbers on addresses, so the customer's phone is the default billing
 * address's.
 */
export default defineShopwareAction(CustomerGetCurrentAction, async ({ context }) => {
  let customer;
  try {
    customer = await readCustomerWithAddresses(context.storefrontClient);
  } catch {
    throw new UnauthenticatedError();
  }

  const firstName = customer.firstName ?? '';
  const lastName = customer.lastName ?? '';
  const displayName = `${firstName} ${lastName}`.trim();
  const salutation = context.systemEntities.salutations.find((entry) => entry.id === customer.salutationId)?.key;

  const stored = customer.addresses ?? [];
  const defaultBilling = stored.find((address) => address.id === customer.defaultBillingAddressId);
  const defaultShipping = stored.find((address) => address.id === customer.defaultShippingAddressId);
  const toCanonical = (address: (typeof stored)[number]) => fromShopwareAddress(address, context.systemEntities);

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      ...(defaultBilling?.phoneNumber ? { phone: defaultBilling.phoneNumber } : {}),
      displayName: displayName || (customer.email ?? ''),
      person: {
        firstName,
        lastName,
        ...(salutation && salutation !== 'not_specified' ? { salutation } : {}),
        ...(customer.title ? { title: customer.title } : {}),
      },
      addresses: stored.map(toCanonical),
      ...(defaultBilling ? { defaultBillingAddress: toCanonical(defaultBilling) } : {}),
      ...(defaultShipping ? { defaultShippingAddress: toCanonical(defaultShipping) } : {}),
    },
  };
});
