import { AuthLoginAction, CustomerNotConfirmedError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes } from '../../shopware-helper/shopwareErrors';

/**
 * Shopware's answers for a customer who has not confirmed the mail of a double opt-in registration.
 * Shopware 6.5 reports it as an inactive customer; it reaches that check only once the password
 * matched, and a customer the merchant deactivated is answered as unknown before it.
 */
const NOT_CONFIRMED_CODES = ['CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED', 'CHECKOUT__CUSTOMER_IS_INACTIVE'];

/**
 * Log a customer in through Shopware's `/account/login`. A customer who has not confirmed the mail
 * of a double opt-in registration gets {@link CustomerNotConfirmedError}; Shopware 6.7.12 and later
 * send that mail again.
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
    if (shopwareErrorCodes(err).some((code) => NOT_CONFIRMED_CODES.includes(code))) throw new CustomerNotConfirmedError();
    return { success: false, message: (err as Error).message };
  }
});
