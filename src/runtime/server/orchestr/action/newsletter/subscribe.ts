import { NewsletterSubscribe } from '@laioutr-core/canonical-types/action';
import { defineShopwareAction } from '../../../action/defineShopwareAction';

export default defineShopwareAction(NewsletterSubscribe, async ({ context, input }) => {
  // TODO: should probably use admin-api, as the storefront-api is rate-limited
  // https://developer.shopware.com/docs/guides/hosting/infrastructure/rate-limiter.html
  await context.storefrontClient.invoke('subscribeToNewsletter post /newsletter/subscribe', {
    body: {
      option: 'subscribe',
      storefrontUrl: 'https://depot-online.de',
      email: input.email,
      firstName: input.person?.firstName,
      lastName: input.person?.lastName,
      street: input.address?.address1,
      city: input.address?.city,
      zipCode: input.address?.postalCode,
      languageId: context.currentSystemEntities.language.id,
      salutationId: context.systemEntities.salutations.find((salutation) => salutation.key === input.person?.salutation)?.id,
    },
  });

  return 'success' as const;
});
