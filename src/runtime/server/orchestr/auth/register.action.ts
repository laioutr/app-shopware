import { useRuntimeConfig } from '#imports';
import { AuthRegisterAction, EmailAlreadyInUseError } from '@laioutr-core/canonical-types/ecommerce';
import type { Schemas } from '../../types/storeApiTypes';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { findSalutationId, resolveAddressIds, toShopwareAddressBody } from '../../shopware-helper/mailingAddress';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes, throwAsInvalidField } from '../../shopware-helper/shopwareErrors';

/**
 * Register a customer through Shopware's `/account/register`. The address becomes the billing
 * address, which Shopware also uses for shipping.
 *
 * Shopware logs the new customer in and answers with a customer-bound context token, persisted the
 * way a login persists it. A sales channel with double opt-in registration answers without one: the
 * customer confirms the mail before they can log in, and the action answers `pending-confirmation`.
 *
 * `acceptedDataProtection` is the customer's `consents.privacyPolicy`. A form that does not ask
 * sends no choice, and then it is `true`: a storefront calling register has collected that consent
 * in its own form.
 */
export default defineShopwareAction(AuthRegisterAction, async ({ context, input, event }) => {
  const { storefrontUrl } = useRuntimeConfig()['@laioutr/app-shopware'];

  if (!storefrontUrl) {
    throw new Error('storefrontUrl is not configured, so Shopware has no domain to build the registration mails from');
  }

  const { storefrontClient, systemEntities } = context;

  // The address inherits the customer's salutation and title unless it names its own.
  const address = { ...input.address, salutation: input.address.salutation ?? input.salutation, title: input.address.title ?? input.title };
  const addressIds = await resolveAddressIds(storefrontClient, systemEntities, address, {
    fieldPrefix: ['address'],
    complete: true,
  });

  storefrontClient.hook('onContextChanged', (newContextToken) => {
    // Same best-effort mirror as the login action: the cookie is written synchronously.
    persistContextToken(event, newContextToken).catch(() => {});
  });

  try {
    const { data: customer } = await storefrontClient.invoke('register post /account/register', {
      body: {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        title: input.title,
        // The generated type marks it required; a shop without a `not_specified` salutation lets
        // Shopware reject the request with its own violation.
        salutationId: findSalutationId(systemEntities.salutations, input.salutation) as string,
        storefrontUrl,
        acceptedDataProtection: input.consents?.privacyPolicy ?? true,
        // `id`, `customerId` and `createdAt` are read-side fields the generated type requires here.
        billingAddress: toShopwareAddressBody(address, addressIds) as Schemas['CustomerAddress'],
      },
    });

    return { status: customer.doubleOptInRegistration && !customer.doubleOptInConfirmDate ? 'pending-confirmation' : 'signed-in' };
  } catch (err) {
    if (shopwareErrorCodes(err).includes('VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE')) throw new EmailAlreadyInUseError();
    return throwAsInvalidField(err);
  }
});
