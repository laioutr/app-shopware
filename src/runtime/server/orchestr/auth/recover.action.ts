import { useRuntimeConfig } from '#imports';
import { AuthRecoverAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { shopwareErrorStatus } from '../../shopware-helper/shopwareErrors';

/**
 * Send Shopware's password recovery mail. Shopware builds the reset link from `storefrontUrl`, which
 * must be a domain of the sales channel, so the link lands on the storefront's own reset page.
 */
export default defineShopwareAction(AuthRecoverAction, async ({ context, input }) => {
  const { storefrontUrl } = useRuntimeConfig()['@laioutr/app-shopware'];

  if (!storefrontUrl) {
    throw new Error('storefrontUrl is not configured, so Shopware has no domain to build the password reset link from');
  }

  try {
    await context.storefrontClient.invoke('sendRecoveryMail post /account/recovery-password', {
      body: { email: input.email, storefrontUrl },
    });
  } catch (err) {
    // An address without an account answers 404. Reporting success for it too keeps the action from
    // telling a caller which addresses have an account.
    if (shopwareErrorStatus(err) !== 404) throw err;
  }
});
