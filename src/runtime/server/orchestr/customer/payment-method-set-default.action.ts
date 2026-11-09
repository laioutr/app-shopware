import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import { ShopwareCustomerPaymentMethodSetDefaultAction } from '../../../shared/tokens/customer';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { shopwareErrorCodes, shopwareErrorStatus, throwAsAccountError } from '../../shopware-helper/shopwareErrors';

/** Shopware's answers for a payment method id the sales channel does not offer, or one that is no id at all. */
const UNKNOWN_METHOD_CODES = ['CHECKOUT__UNKNOWN_PAYMENT_METHOD', 'FRAMEWORK__INVALID_UUID'];

/** Set the customer's default payment method through `/account/change-payment-method/{paymentMethodId}`. */
export default defineShopwareAction(ShopwareCustomerPaymentMethodSetDefaultAction, async ({ context, input }) => {
  try {
    await context.storefrontClient.invoke('changePaymentMethod post /account/change-payment-method/{paymentMethodId}', {
      pathParams: { paymentMethodId: input.paymentMethodId },
    });
  } catch (err) {
    if (shopwareErrorCodes(err).some((code) => UNKNOWN_METHOD_CODES.includes(code)) || shopwareErrorStatus(err) === 404) {
      throw new InvalidFieldError('INVALID_VALUE', ['paymentMethodId']);
    }
    throwAsAccountError(err);
  }
});
