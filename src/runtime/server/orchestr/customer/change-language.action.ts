import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import { ShopwareCustomerChangeLanguageAction } from '../../../shared/tokens/customer';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { accountCall } from '../../shopware-helper/shopwareErrors';

const normalizeLocale = (locale: string) => locale.replace('_', '-').toLowerCase();

/**
 * Set the customer's language through `/account/change-language`, which takes a Shopware language
 * id. A `locale` is matched exactly against the sales channel's languages: the customer picked that
 * one, so the nearest other language would be a guess.
 */
export default defineShopwareAction(ShopwareCustomerChangeLanguageAction, async ({ context, input }) => {
  const languageId =
    input.locale === undefined ?
      context.languageId
    : context.systemEntities.locales.find((locale) => locale.iso && normalizeLocale(locale.iso) === normalizeLocale(input.locale!))
        ?.languageId;

  if (!languageId) throw new InvalidFieldError('INVALID_VALUE', ['locale']);

  await accountCall(
    () => context.storefrontClient.invoke('changeLanguage post /account/change-language', { body: { language: languageId } }),
    {
      fieldNames: { language: 'locale' },
    }
  );
});
