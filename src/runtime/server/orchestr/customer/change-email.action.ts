import { CustomerChangeEmailAction, EmailAlreadyInUseError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { throwAsCredentialChangeError } from '../../shopware-helper/credentialChange';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes } from '../../shopware-helper/shopwareErrors';

/**
 * Change the customer's email address through `/account/change-email`, which checks the current
 * password and changes the address at once. A context token Shopware answers with is persisted, as
 * after a login.
 */
export default defineShopwareAction(CustomerChangeEmailAction, async ({ context, input, event }) => {
  context.storefrontClient.hook('onContextChanged', (newContextToken) => {
    // Same best-effort mirror as the login action: the cookie is written synchronously.
    persistContextToken(event, newContextToken).catch(() => {});
  });

  try {
    await context.storefrontClient.invoke('changeEmail post /account/change-email', {
      body: { email: input.email, emailConfirmation: input.email, password: input.currentPassword },
    });
  } catch (err) {
    if (shopwareErrorCodes(err).includes('VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE')) throw new EmailAlreadyInUseError();
    throwAsCredentialChangeError(err, { emailConfirmation: 'email' });
  }

  return { status: 'changed' as const };
});
