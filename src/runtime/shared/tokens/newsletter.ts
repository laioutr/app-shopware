import { z } from 'zod/v4';
import { defineActionToken } from '@laioutr-core/core-types/orchestr';

/**
 * Confirm a newsletter subscription from the link in its double opt-in mail (Shopware
 * `/newsletter/confirm`), the second step after `SubscribeAction`.
 *
 * `link` is the URL the customer opened; the handler reads Shopware's `hash` and `em` from it. A link
 * opened a second time confirms again without failing.
 *
 * @public
 * @throws {@link EmailConfirmationTokenInvalidError} When Shopware knows no subscription for the
 * link, or the link carries no hash.
 */
export const ShopwareNewsletterConfirmAction = defineActionToken('shopware/newsletter/confirm', {
  input: z.object({
    link: z.url().meta({ description: 'The URL of the confirmation link, as the customer opened it.' }),
  }),
});

/**
 * Unsubscribe an address from the newsletter (Shopware `/newsletter/unsubscribe`). The answer is the
 * same for an address that is not subscribed, so the action cannot be used to find out which
 * addresses are.
 *
 * @public
 */
export const ShopwareNewsletterUnsubscribeAction = defineActionToken('shopware/newsletter/unsubscribe', {
  input: z.object({
    email: z.email(),
  }),
});
