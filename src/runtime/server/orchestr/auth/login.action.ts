import { AuthLoginAction, CustomerNotConfirmedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes } from '../../shopware-helper/shopwareErrors';

/**
 * Log a customer in through Shopware's `/account/login`. A customer who has not confirmed the mail
 * of a double opt-in registration gets {@link CustomerNotConfirmedError}, and Shopware sends that
 * mail again.
 */
export default defineShopwareAction(AuthLoginAction, async ({ context, input, event }) => {
  try {
    context.storefrontClient.hook('onContextChanged', (newContextToken) => {
      // Best-effort mirror: persistContextToken writes the cookie synchronously (before its
      // awaited `changed` hook), so the cookie is always set; we don't block the callback on the
      // host-mirror notification, and `.catch` keeps the floating promise handled.
      persistContextToken(event, newContextToken).catch(() => {});
    });

    const res = await context.storefrontClient.invoke('loginCustomer post /account/login', {
      body: { username: input.email, password: input.password },
    });

    return { success: res.status === 200 };
  } catch (err) {
    // Shopware checks the opt-in only after the password matched, so this tells no stranger that
    // the account exists.
    if (shopwareErrorCodes(err).includes('CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED')) throw new CustomerNotConfirmedError();
    return { success: false, message: (err as Error).message };
  }
});
