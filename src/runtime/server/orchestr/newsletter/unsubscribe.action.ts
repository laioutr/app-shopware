import { ShopwareNewsletterUnsubscribeAction } from '../../../shared/tokens/newsletter';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { shopwareErrorStatus } from '../../shopware-helper/shopwareErrors';

/** Remove an address from the newsletter through `/newsletter/unsubscribe`. */
export default defineShopwareAction(ShopwareNewsletterUnsubscribeAction, async ({ context, input }) => {
  try {
    await context.storefrontClient.invoke('unsubscribeToNewsletter post /newsletter/unsubscribe', { body: { email: input.email } });
  } catch (err) {
    // An address that is not subscribed answers 404. Reporting success for it too keeps the action
    // from telling a caller which addresses are.
    if (shopwareErrorStatus(err) !== 404) throw err;
  }
});
