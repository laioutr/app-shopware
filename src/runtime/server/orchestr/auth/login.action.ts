import { createError } from '#imports';
import { AuthLoginAction, CustomerNotConfirmedError, InvalidCredentialsError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes, shopwareErrorStatus } from '../../shopware-helper/shopwareErrors';

/**
 * Shopware's answers for a customer who has not confirmed the mail of a double opt-in registration.
 * Shopware 6.5 reports it as an inactive customer. Both answers come only once the password matched,
 * and a confirmed customer the merchant deactivated is not found before that check.
 */
const NOT_CONFIRMED_CODES = ['CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED', 'CHECKOUT__CUSTOMER_IS_INACTIVE'];

/** Shopware's answer for an unknown address and for a wrong password alike. */
const BAD_CREDENTIALS_CODE = 'CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS';

/**
 * Shopware 6.5 answers the same with a bare 401 whose code is `"0"`. A wrong access key answers 412
 * and an unconfirmed customer has a code of its own, so neither reads as wrong credentials.
 */
const isBadCredentials = (err: unknown, codes: string[]) =>
  codes.includes(BAD_CREDENTIALS_CODE) || (shopwareErrorStatus(err) === 401 && codes.every((code) => code === '0'));

/**
 * Log a customer in through Shopware's `/account/login`. A wrong address or password gets
 * {@link InvalidCredentialsError}, and a customer who has not confirmed the mail of a double opt-in
 * registration {@link CustomerNotConfirmedError}; Shopware 6.7.12 and later send that mail again.
 * Shopware's refusal of too many attempts answers 429, so a form can ask to wait rather than report
 * an outage. Any other failure is thrown as it came.
 */
export default defineShopwareAction(AuthLoginAction, async ({ context, input, event }) => {
  try {
    context.storefrontClient.hook('onContextChanged', (newContextToken) => {
      // Best-effort mirror: persistContextToken writes the cookie synchronously (before its
      // awaited `changed` hook), so the cookie is always set; we don't block the callback on the
      // host-mirror notification, and `.catch` keeps the floating promise handled.
      persistContextToken(event, newContextToken).catch(() => {});
    });

    // The client throws for every answer that is not a success, so reaching the return means signed in.
    await context.storefrontClient.invoke('loginCustomer post /account/login', {
      body: { username: input.email, password: input.password },
    });

    return { success: true };
  } catch (err) {
    const codes = shopwareErrorCodes(err);
    if (codes.some((code) => NOT_CONFIRMED_CODES.includes(code))) throw new CustomerNotConfirmedError();
    if (isBadCredentials(err, codes)) throw new InvalidCredentialsError();
    if (shopwareErrorStatus(err) === 429) throw createError({ statusCode: 429, statusMessage: 'Too many login attempts' });
    throw err;
  }
});
