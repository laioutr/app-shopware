import { z } from 'zod/v4';
import { defineActionToken } from '@laioutr-core/core-types/orchestr';

/** A shipping or payment method of the sales channel, in the request's language. */
export const ShopwareContextMethod = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

/**
 * The visitor's Shopware session: its currency, language and shipping country, the chosen shipping
 * and payment method, and the methods available to choose from (Shopware `GET /context`,
 * `/shipping-method` and `/payment-method`, the latter two with their availability rules applied).
 *
 * `currency` and `locale` are the market's, which this app sends with every Store API call; they
 * change with the market, not with `ShopwareContextUpdateAction`. `defaultPaymentMethodId` is the
 * signed-in customer's default, where the shop keeps one.
 *
 * @public
 */
export const ShopwareContextGetAction = defineActionToken('shopware/context/get', {
  output: z.object({
    signedIn: z.boolean(),
    currency: z.string().meta({ description: 'ISO 4217 code.' }),
    locale: z.string().optional().meta({ description: 'BCP 47 language tag.' }),
    countryCode: z.string().optional().meta({ description: 'ISO 3166-1 alpha-2 code of the shipping country.' }),
    shippingMethod: ShopwareContextMethod.optional(),
    paymentMethod: ShopwareContextMethod.optional(),
    defaultPaymentMethodId: z.string().optional(),
    shippingMethods: z.array(ShopwareContextMethod),
    paymentMethods: z.array(ShopwareContextMethod),
  }),
});

/**
 * Switch the shipping method, payment method or shipping country of the visitor's session
 * (Shopware `PATCH /context`), which the cart's shipping costs and totals follow. Fields left out
 * keep their value. A visitor without a session gets one, persisted like a cart write's.
 *
 * @public
 * @throws {@link InvalidFieldError} For a method or country the sales channel does not offer, on the
 * field that named it.
 */
export const ShopwareContextUpdateAction = defineActionToken('shopware/context/update', {
  input: z.object({
    shippingMethodId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    countryCode: z.string().optional().meta({ description: 'ISO 3166-1 alpha-2 code of the shipping country.' }),
  }),
});
