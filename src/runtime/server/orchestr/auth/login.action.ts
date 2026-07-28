import { AuthLoginAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

export default defineShopwareAction(AuthLoginAction, async ({ context, input, event }) => {
  try {
    context.storefrontClient.hook('onContextChanged', (newContextToken) => {
      // Best-effort mirror: persistContextToken writes the cookie synchronously (before its
      // awaited `changed` hook), so the cookie is always set; we don't block the callback on the
      // host-mirror notification, and `.catch` keeps the floating promise handled.
      persistContextToken(event, newContextToken).catch(() => {});
    });

    const res = await context.storefrontClient.invoke('loginCustomer post /account/login', {
      body: { username: input.email, password: input.password },
    });

    return { success: res.status === 200 };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});
