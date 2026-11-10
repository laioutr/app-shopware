import { CustomerChangePasswordAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { throwAsCredentialChangeError } from '../../shopware-helper/credentialChange';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

/**
 * Change the customer's password through `/account/change-password`, which checks the current one.
 * Shopware may answer with a new context token for the same customer; it is persisted the way a
 * login persists it, so the customer stays signed in.
 */
export default defineShopwareAction(CustomerChangePasswordAction, async ({ context, input, event }) => {
  context.storefrontClient.hook('onContextChanged', (newContextToken) => {
    // Same best-effort mirror as the login action: the cookie is written synchronously.
    persistContextToken(event, newContextToken).catch(() => {});
  });

  try {
    await context.storefrontClient.invoke('changePassword post /account/change-password', {
      body: { password: input.currentPassword, newPassword: input.newPassword, newPasswordConfirm: input.newPassword },
    });
  } catch (err) {
    throwAsCredentialChangeError(err, { newPasswordConfirm: 'newPassword' });
  }
});
