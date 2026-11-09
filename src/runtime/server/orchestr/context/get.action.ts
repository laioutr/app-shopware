import { ShopwareContextGetAction } from '../../../shared/tokens/context';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { toContextMethod } from '../../shopware-helper/salesChannelContext';

/**
 * Read the session through `GET /context`, and the shipping and payment methods its availability
 * rules allow, in parallel. No context token is persisted: for a visitor without one Shopware mints a
 * guest context per read, and a read must not start a session.
 */
export default defineShopwareAction(ShopwareContextGetAction, async ({ context }) => {
  const { storefrontClient, systemEntities } = context;

  const [salesChannelContext, shippingMethods, paymentMethods] = await Promise.all([
    storefrontClient.invoke('readContext get /context').then((response) => response.data),
    storefrontClient
      .invoke('readShippingMethod post /shipping-method', { query: { onlyAvailable: true }, body: {} })
      .then((response) => response.data.elements ?? []),
    storefrontClient
      .invoke('readPaymentMethod post /payment-method', { body: { onlyAvailable: true } })
      .then((response) => response.data.elements ?? []),
  ]);

  const languageId = salesChannelContext.context?.languageIdChain?.[0] ?? context.languageId;
  const countryId = salesChannelContext.shippingLocation?.country?.id;
  const defaultPaymentMethodId = salesChannelContext.customer?.defaultPaymentMethodId;

  return {
    signedIn: !!salesChannelContext.customer && !salesChannelContext.customer.guest,
    currency: salesChannelContext.currency?.isoCode ?? context.currency,
    locale: systemEntities.locales.find((locale) => locale.languageId === languageId)?.iso ?? undefined,
    countryCode:
      salesChannelContext.shippingLocation?.country?.iso ?? systemEntities.countries.find((country) => country.id === countryId)?.iso,
    shippingMethod: salesChannelContext.shippingMethod ? toContextMethod(salesChannelContext.shippingMethod) : undefined,
    paymentMethod: salesChannelContext.paymentMethod ? toContextMethod(salesChannelContext.paymentMethod) : undefined,
    ...(defaultPaymentMethodId ? { defaultPaymentMethodId } : {}),
    shippingMethods: shippingMethods.map(toContextMethod),
    paymentMethods: paymentMethods.map(toContextMethod),
  };
});
