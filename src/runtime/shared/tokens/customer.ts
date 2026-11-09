import { z } from 'zod/v4';
import { defineActionToken } from '@laioutr-core/core-types/orchestr';

/**
 * Delete the current customer's account (Shopware `DELETE /account/customer`). Shopware removes the
 * customer with their addresses and wishlist; orders stay with the shop. The session ends with it:
 * the context token is cleared and `shopware:context-token:changed` fires with `null`, as on a logout.
 *
 * Shopware asks for no password, so confirming the deletion is the form's concern.
 *
 * @public
 * @throws {@link UnauthenticatedError}
 */
export const ShopwareCustomerDeleteAction = defineActionToken('shopware/customer/delete');

/**
 * Make a payment method the current customer's default, which preselects it in their next checkout
 * (Shopware `/account/change-payment-method/{paymentMethodId}`). The methods to choose from are the
 * `paymentMethods` of `ShopwareContextGetAction`.
 *
 * @public
 * @throws {@link UnauthenticatedError}
 * @throws {@link InvalidFieldError} `field: ['paymentMethodId']` for a method the sales channel does
 * not offer.
 */
export const ShopwareCustomerPaymentMethodSetDefaultAction = defineActionToken('shopware/customer/payment-method-set-default', {
  input: z.object({
    paymentMethodId: z.string(),
  }),
});

/**
 * Set the language Shopware writes to the current customer in — order and account mails
 * (Shopware `/account/change-language`). It does not change the language the storefront is served
 * in, which the market decides.
 *
 * Without `locale`, the customer gets the language the request is served in, which is what a
 * storefront wants after the customer switched markets.
 *
 * @public
 * @throws {@link UnauthenticatedError}
 * @throws {@link InvalidFieldError} `field: ['locale']` for a language the sales channel does not
 * offer.
 */
export const ShopwareCustomerChangeLanguageAction = defineActionToken('shopware/customer/change-language', {
  input: z.object({
    locale: z.string().optional().meta({ description: 'BCP 47 language tag, e.g. `de-DE`.' }),
  }),
});

/**
 * The current customer's newsletter subscription (Shopware `/account/newsletter-recipient`), for the
 * toggle on an account page. Subscribing goes through `SubscribeAction`, unsubscribing through
 * `ShopwareNewsletterUnsubscribeAction`.
 *
 * `subscribed`: receives the newsletter. `pending-confirmation`: subscribed, but the double opt-in
 * mail is not confirmed yet. `unsubscribed`: was subscribed and left. `not-subscribed`: never was.
 *
 * @public
 * @throws {@link UnauthenticatedError}
 */
export const ShopwareCustomerGetNewsletterStatusAction = defineActionToken('shopware/customer/get-newsletter-status', {
  output: z.object({
    status: z.enum(['subscribed', 'pending-confirmation', 'unsubscribed', 'not-subscribed']),
  }),
});
