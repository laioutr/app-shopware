import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import { ShopwareContextUpdateAction } from '../../../shared/tokens/context';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { persistContextToken } from '../../shopware-helper/persistContextToken';
import { throwAsInvalidField } from '../../shopware-helper/shopwareErrors';

/**
 * Switch the session's shipping method, payment method or shipping country through `PATCH /context`.
 * A visitor without a context token gets a new one from Shopware, persisted as a cart write persists
 * it, so the choice holds for the next request.
 */
export default defineShopwareAction(ShopwareContextUpdateAction, async ({ context, input, event }) => {
  const { storefrontClient, systemEntities } = context;

  let countryId: string | undefined;
  if (input.countryCode !== undefined) {
    countryId = systemEntities.countries.find((country) => country.iso?.toUpperCase() === input.countryCode!.toUpperCase())?.id;
    if (!countryId) throw new InvalidFieldError('INVALID_VALUE', ['countryCode']);
  }

  const body = {
    ...(input.shippingMethodId === undefined ? {} : { shippingMethodId: input.shippingMethodId }),
    ...(input.paymentMethodId === undefined ? {} : { paymentMethodId: input.paymentMethodId }),
    ...(countryId ? { countryId } : {}),
  };
  if (Object.keys(body).length === 0) return;

  storefrontClient.hook('onContextChanged', (newContextToken) => {
    // Same best-effort mirror as the login action: the cookie is written synchronously.
    persistContextToken(event, newContextToken).catch(() => {});
  });

  try {
    await storefrontClient.invoke('updateContext patch /context', { body });
  } catch (err) {
    throwAsInvalidField(err);
  }
});
