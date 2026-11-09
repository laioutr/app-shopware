import { EmailConfirmationTokenInvalidError } from '@laioutr-core/canonical-types/ecommerce';
import { ShopwareNewsletterConfirmAction } from '../../../shared/tokens/newsletter';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { isConfirmationHashRefused, readLinkParams } from '../../shopware-helper/mailLink';

/**
 * Confirm a newsletter subscription with the `hash` and `em` of Shopware's double opt-in link,
 * through `/newsletter/confirm`. Shopware knows the recipient by the hash and checks `em` against
 * its address.
 */
export default defineShopwareAction(ShopwareNewsletterConfirmAction, async ({ context, input }) => {
  const params = readLinkParams(input.link, ['hash', 'em']);
  if (!params) throw new EmailConfirmationTokenInvalidError();

  try {
    await context.storefrontClient.invoke('confirmNewsletter post /newsletter/confirm', { body: params });
  } catch (err) {
    if (isConfirmationHashRefused(err)) throw new EmailConfirmationTokenInvalidError();
    throw err;
  }
});
