import { CustomerGetCurrentAction, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readCustomerWithAddresses, toAddressBookEntries } from '../../shopware-helper/customerAddresses';
import { salutationKeyOf } from '../../shopware-helper/mailingAddress';
import { accountCall } from '../../shopware-helper/shopwareErrors';

/**
 * Read the customer behind the request's context token, addresses included, in one Store API call.
 * Shopware answers `403` when the token belongs to a guest context, which is the signal callers use
 * to tell a session from none, and {@link UnauthenticatedError} carries it on.
 *
 * Shopware keeps phone numbers on addresses, so the customer's phone is the default billing
 * address's.
 */
export default defineShopwareAction(CustomerGetCurrentAction, async ({ context }) => {
  const customer = await accountCall(() => readCustomerWithAddresses(context.storefrontClient));

  const firstName = customer.firstName ?? '';
  const lastName = customer.lastName ?? '';
  const displayName = `${firstName} ${lastName}`.trim();
  const salutation = salutationKeyOf(context.systemEntities.salutations, customer.salutationId);

  const addresses = toAddressBookEntries(customer, context.systemEntities);
  const phone = addresses.find((entry) => entry.isDefaultBilling)?.address.phone;

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      ...(phone ? { phone } : {}),
      displayName: displayName || (customer.email ?? ''),
      person: {
        firstName,
        lastName,
        ...(salutation ? { salutation } : {}),
        ...(customer.title ? { title: customer.title } : {}),
      },
      addresses,
    },
  };
});
