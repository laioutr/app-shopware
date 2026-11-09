import { z } from 'zod/v4';
import { defineActionToken } from '@laioutr-core/core-types/orchestr';

/**
 * Whether a password recovery link can still set a new password, so the reset page can offer a new
 * recovery mail before the customer types one (Shopware `/account/customer-recovery-is-expired`).
 *
 * `link` is the URL the customer opened, passed on unchanged as to `AuthResetPasswordAction`.
 * `expired`: the link is older than Shopware keeps it (two hours by default). `invalid`: it was used
 * already, never existed, or carries no hash. The statuses match the reasons of
 * `PasswordResetTokenInvalidError`, which the reset itself throws.
 *
 * @public
 */
export const ShopwareAuthCheckResetLinkAction = defineActionToken('shopware/auth/check-reset-link', {
  input: z.object({
    link: z.url().meta({ description: 'The URL of the recovery link, as the customer opened it.' }),
  }),
  output: z.object({
    status: z.enum(['valid', 'expired', 'invalid']),
  }),
});
