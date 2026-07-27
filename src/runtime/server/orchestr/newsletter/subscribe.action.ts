import { consola } from 'consola';
import { useRuntimeConfig } from '#imports';
import { SubscribeAction } from '@laioutr-core/canonical-types/newsletter';
import { defineShopwareAction } from '../../middleware/defineShopware';

const logger = consola.withTag('shopware/newsletter');

export default defineShopwareAction(SubscribeAction, async ({ context, input }) => {
  // Shopware builds the double-opt-in confirmation link from `storefrontUrl`, and requires it to
  // be a domain configured in the sales channel — so the app's configured storefront URL is the
  // only valid value. Without it the subscription cannot be completed, so fail via the action's
  // own `error` status rather than posting a bogus URL.
  const { storefrontUrl } = useRuntimeConfig()['@laioutr-app/shopware'];
  if (!storefrontUrl) {
    logger.error('Cannot subscribe to newsletter: storefrontUrl is not configured');
    return { status: 'error' as const };
  }

  // TODO: should probably use admin-api, as the storefront-api is rate-limited
  // https://developer.shopware.com/docs/guides/hosting/infrastructure/rate-limiter.html
  await context.storefrontClient.invoke('subscribeToNewsletter post /newsletter/subscribe', {
    body: {
      option: 'subscribe',
      storefrontUrl,
      email: input.email,
      firstName: input.person?.firstName,
      lastName: input.person?.lastName,
      street: input.address?.address1,
      city: input.address?.city,
      zipCode: input.address?.postalCode,
      languageId: context.currentSystemEntities.locale.languageId,
      salutationId: context.systemEntities.salutations.find((salutation) => salutation.key === input.person?.salutation)?.id,
    },
  });

  return { status: 'success' as const };
});
