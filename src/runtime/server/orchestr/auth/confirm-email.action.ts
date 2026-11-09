import { AuthConfirmEmailAction, EmailConfirmationTokenInvalidError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { isConfirmationHashRefused, readLinkParams } from '../../shopware-helper/mailLink';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { shopwareErrorCodes } from '../../shopware-helper/shopwareErrors';

/** Shopware's answer for a customer who confirmed already, which a second click on the link sends. */
const ALREADY_CONFIRMED = 'CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED';

/**
 * Confirm a double opt-in registration with the `hash` and `em` of Shopware's confirmation link,
 * through `/account/register-confirm`. Shopware signs the customer in with a new context token,
 * persisted the way a login persists it; the answer is `signed-in` only once that token arrived,
 * because without it the session is not the customer's.
 */
export default defineShopwareAction(AuthConfirmEmailAction, async ({ context, input, event }) => {
  const params = readLinkParams(input.link, ['hash', 'em']);
  if (!params) throw new EmailConfirmationTokenInvalidError();

  let signedIn = false;
  context.storefrontClient.hook('onContextChanged', (newContextToken) => {
    signedIn = true;
    // Same best-effort mirror as the login action: the cookie is written synchronously.
    persistContextToken(event, newContextToken).catch(() => {});
  });

  try {
    await context.storefrontClient.invoke('registerConfirm post /account/register-confirm', { body: params });
  } catch (err) {
    if (shopwareErrorCodes(err).includes(ALREADY_CONFIRMED)) return { status: 'confirmed' as const };
    if (isConfirmationHashRefused(err)) throw new EmailConfirmationTokenInvalidError();
    throw err;
  }

  return { status: signedIn ? ('signed-in' as const) : ('confirmed' as const) };
});
