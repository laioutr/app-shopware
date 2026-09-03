import { CustomerGetCurrentAction, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';

/**
 * Read the customer behind the request's context token. Shopware answers `403` when the token
 * belongs to a guest context, which is the signal callers use to tell a session from none.
 *
 * `addresses` stays empty: Shopware returns addresses only as an association, and each one needs
 * its `countryId` resolved to the ISO code `MailingAddress` requires. Nothing reads them yet, so
 * the lookup is not made — extend this handler before relying on the field.
 */
export default defineShopwareAction(CustomerGetCurrentAction, async ({ context }) => {
  let customer;
  try {
    customer = await context.storefrontClient.invoke('readCustomer post /account/customer', {});
  } catch {
    throw new UnauthenticatedError();
  }

  const firstName = customer.firstName ?? '';
  const lastName = customer.lastName ?? '';
  const displayName = `${firstName} ${lastName}`.trim();

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      displayName: displayName || (customer.email ?? ''),
      person: { firstName, lastName, salutation: customer.salutation?.salutationKey, title: customer.title ?? undefined },
      addresses: [],
    },
  };
});
