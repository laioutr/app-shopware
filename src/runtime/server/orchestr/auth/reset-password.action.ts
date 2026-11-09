import { AuthResetPasswordAction, PasswordResetTokenInvalidError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readLinkParams, recoveryHashFailure } from '../../shopware-helper/mailLink';
import { throwAsInvalidField } from '../../shopware-helper/shopwareErrors';

/**
 * Set a new password with the `hash` of Shopware's recovery link, through
 * `/account/recovery-password-confirm`. Shopware signs no one in with it, so no context token is
 * kept. Its password policy reports on `newPassword`; the confirmation Shopware asks for is the same
 * value, because asking twice is the form's concern.
 */
export default defineShopwareAction(AuthResetPasswordAction, async ({ context, input }) => {
  const params = readLinkParams(input.link, ['hash']);
  if (!params) throw new PasswordResetTokenInvalidError('invalid');

  try {
    await context.storefrontClient.invoke('recoveryPassword post /account/recovery-password-confirm', {
      body: { hash: params.hash, newPassword: input.newPassword, newPasswordConfirm: input.newPassword },
    });
  } catch (err) {
    const reason = recoveryHashFailure(err);
    if (reason) throw new PasswordResetTokenInvalidError(reason);
    throwAsInvalidField(err, [], undefined, { newPasswordConfirm: 'newPassword' });
  }
});
