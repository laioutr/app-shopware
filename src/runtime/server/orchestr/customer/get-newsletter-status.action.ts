import { consola } from 'consola';
import { ShopwareCustomerGetNewsletterStatusAction } from '../../../shared/tokens/customer';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { accountCall } from '../../shopware-helper/shopwareErrors';

const logger = consola.withTag('shopware/newsletter');

type NewsletterStatus = 'subscribed' | 'pending-confirmation' | 'unsubscribed' | 'not-subscribed';

/**
 * Shopware's recipient statuses: `direct` without double opt-in, `optIn` once the mail is confirmed,
 * `notSet` while it is not, `optOut` after unsubscribing, `undefined` with no recipient at all.
 */
const STATUSES: Record<string, NewsletterStatus> = {
  direct: 'subscribed',
  optIn: 'subscribed',
  notSet: 'pending-confirmation',
  optOut: 'unsubscribed',
  undefined: 'not-subscribed',
};

/** The customer's newsletter status from `/account/newsletter-recipient`. */
export default defineShopwareAction(ShopwareCustomerGetNewsletterStatusAction, async ({ context }) => {
  const { data } = await accountCall(() =>
    context.storefrontClient.invoke('readNewsletterRecipient post /account/newsletter-recipient', {})
  );

  const status = STATUSES[data?.status ?? 'undefined'];
  if (status) return { status };

  // A plugin can add statuses; the customer is shown as not subscribed rather than the page failing.
  logger.warn(`Unknown newsletter recipient status "${data?.status}"; answering not-subscribed`);
  return { status: 'not-subscribed' as const };
});
