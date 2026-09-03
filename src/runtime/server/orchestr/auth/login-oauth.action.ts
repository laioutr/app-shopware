import { AuthLoginOauthAction } from '@laioutr-core/canonical-types/ecommerce';
import { useRuntimeConfig } from '#imports';
import { defineShopwareAction } from '../../middleware/defineShopware';

/**
 * Send a visitor asking for their account to Shopware's own login page. Shopware authenticates
 * with credentials rather than an OAuth handshake, so this answers the union's `account` arm and
 * the storefront navigates there.
 *
 * `returnTo` is dropped: Shopware's login redirect takes one of its own route names, not a URL,
 * so a laioutr path cannot travel through it.
 */
export default defineShopwareAction(AuthLoginOauthAction, async () => {
  const { storefrontUrl } = useRuntimeConfig()['@laioutr/app-shopware'];

  if (!storefrontUrl) {
    throw new Error('storefrontUrl is not configured, so there is no Shopware login page to send the customer to');
  }

  return {
    type: 'account' as const,
    link: { type: 'url' as const, href: new URL('/account/login', storefrontUrl).toString() },
  };
});
