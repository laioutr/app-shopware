import { setCookie, useRuntimeConfig } from '#imports';
import { AuthLoginAction } from '@laioutr-core/canonical-types/ecommerce';
import { CONTEXT_TOKEN_COOKIE } from '../../const/cookieKeys';
import { defineShopwareAction } from '../../middleware/defineShopware';

export default defineShopwareAction(AuthLoginAction, async ({ context, input, event }) => {
  try {
    const config = useRuntimeConfig()['@laioutr-app/shopware'];

    context.storefrontClient.hook('onContextChanged', (newContextToken) => {
      setCookie(event, CONTEXT_TOKEN_COOKIE, newContextToken, {
        maxAge: 60 * 60 * 24 * 365, // days
        path: '/',
        sameSite: 'lax',
        secure: config.endpoint.startsWith('https://'),
      });
    });

    const res = await context.storefrontClient.invoke('loginCustomer post /account/login', {
      body: { username: input.email, password: input.password },
    });

    return { success: res.status === 200 };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});
