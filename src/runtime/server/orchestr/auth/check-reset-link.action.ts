import { consola } from 'consola';
import { ShopwareAuthCheckResetLinkAction } from '../../../shared/tokens/auth';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { readLinkParams, recoveryHashFailure } from '../../shopware-helper/mailLink';

const logger = consola.withTag('shopware/auth');

/**
 * Shopware's `ArrayStruct` answer. Its OpenAPI document wraps the flag in `data`, while the route
 * serializes the struct's values at the top level, so both are read.
 */
type RecoveryIsExpiredResponse = { isExpired?: unknown; data?: { isExpired?: unknown }[] };

const isExpiredOf = (response: RecoveryIsExpiredResponse | undefined): boolean | undefined => {
  const flag = response?.isExpired ?? response?.data?.[0]?.isExpired;
  return typeof flag === 'boolean' ? flag : undefined;
};

/**
 * Ask Shopware's `/account/customer-recovery-is-expired` about the `hash` of a recovery link. An
 * answer without a readable flag is reported as `valid` with a warning: the reset itself still
 * refuses a hash Shopware does not accept, so the page only loses its early notice.
 */
export default defineShopwareAction(ShopwareAuthCheckResetLinkAction, async ({ context, input }) => {
  const params = readLinkParams(input.link, ['hash']);
  if (!params) return { status: 'invalid' as const };

  try {
    const response = await context.storefrontClient.invoke('getCustomerRecoveryIsExpired post /account/customer-recovery-is-expired', {
      body: { hash: params.hash },
    });

    const isExpired = isExpiredOf(response.data as RecoveryIsExpiredResponse | undefined);
    if (isExpired === undefined) {
      logger.warn('customer-recovery-is-expired answered without an isExpired flag; reporting the link as valid');
    }
    return { status: isExpired ? ('expired' as const) : ('valid' as const) };
  } catch (err) {
    const reason = recoveryHashFailure(err);
    if (reason) return { status: reason };
    throw err;
  }
});
