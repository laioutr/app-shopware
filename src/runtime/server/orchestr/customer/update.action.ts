import { CustomerUpdateAction } from '@laioutr-core/canonical-types/ecommerce';
import type { operations, Schemas } from '../../types/storeApiTypes';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { listCustomerAddresses, readCustomer } from '../../shopware-helper/customerAddresses';
import { customFieldsToWrite } from '../../shopware-helper/customerCustomFields';
import { findSalutationId, toShopwareAddressBodyFromStored } from '../../shopware-helper/mailingAddress';
import { accountCall, bodyFieldOfColumn } from '../../shopware-helper/shopwareErrors';

type ChangeProfileBody = operations['changeProfile post /account/change-profile']['body'] & {
  accountType?: string;
  vatIds?: string[];
  customFields?: Record<string, unknown>;
};

/**
 * Update the customer's profile through `/account/change-profile`.
 *
 * That route replaces the profile and requires name and salutation on every call, so the stored
 * customer fills in whatever the input leaves out. Shopware keeps phone numbers on addresses, so a
 * `phone` is written to the default billing address, which is where the customer read takes it from.
 * Shopware stores the `customFields` the shop made writable through the Store API and drops the
 * rest; {@link customFieldsToWrite} keeps Shopware 6.5 from erasing the others.
 */
export default defineShopwareAction(CustomerUpdateAction, async ({ context, input }) => {
  const { storefrontClient, systemEntities } = context;

  const customer = await accountCall(() => readCustomer(storefrontClient));
  const customFields = input.customFields ? await customFieldsToWrite(input.customFields, context) : undefined;

  if (input.person || customFields) {
    const person = input.person ?? {};
    const salutationId =
      person.salutation === undefined ? customer.salutationId : findSalutationId(systemEntities.salutations, person.salutation);

    const body: ChangeProfileBody = {
      firstName: person.firstName ?? customer.firstName,
      lastName: person.lastName ?? customer.lastName,
      // Required by the generated type; Shopware rejects a missing one with its own violation.
      salutationId: salutationId as string,
      title: person.title ?? customer.title,
      // Up to 6.7, change-profile clears the company and VAT ids unless the request names a business
      // account, so the stored account type travels along.
      accountType: customer.accountType,
      company: customer.company,
      ...(customer.vatIds?.length ? { vatIds: customer.vatIds } : {}),
      ...(customFields ? { customFields } : {}),
    };

    await accountCall(() => storefrontClient.invoke('changeProfile post /account/change-profile', { body }), {
      fieldPrefix: ['person'],
      columnPointer: bodyFieldOfColumn,
    });
  }

  if (input.phone !== undefined) {
    const addressId = customer.defaultBillingAddressId;
    const [stored] = await accountCall(() => listCustomerAddresses(storefrontClient, addressId));
    if (!stored) return;

    // Shopware validates the whole address on every write, so the stored one travels along.
    const body = { ...toShopwareAddressBodyFromStored(stored), phoneNumber: input.phone } as Schemas['CustomerAddressBody'];
    await accountCall(
      () => storefrontClient.invoke('updateCustomerAddress patch /account/address/{addressId}', { pathParams: { addressId }, body }),
      {
        fieldPrefix: [],
        columnPointer: bodyFieldOfColumn,
      }
    );
  }
});
