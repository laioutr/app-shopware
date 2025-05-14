import { StorefrontClient } from '../../types/shopware';
import { swTranslated } from '../swTranslated';

export const getSystemIds = async (client: StorefrontClient) => {
  const rawCurrencies = await client.invoke('readCurrency post /currency');
  const currencies = rawCurrencies.data.map((currency) => ({
    id: currency.id,
    name: swTranslated(currency, 'name'),
    iso: swTranslated(currency, 'isoCode'),
  }));

  const rawSalutations = await client.invoke('readSalutation post /salutation');
  const salutations =
    rawSalutations.data.elements?.map((salutation) => ({
      id: salutation.id,
      key: salutation.salutationKey,
      displayName: swTranslated(salutation, 'displayName'),
    })) ?? [];

  const rawCountries = await client.invoke('readCountry post /country');
  const countries =
    rawCountries.data.elements?.map((country) => ({
      id: country.id,
      iso: country.iso,
      iso3: country.iso3,
      name: swTranslated(country, 'name'),
    })) ?? [];

  const rawLanguages = await client.invoke('readLanguages post /language');
  const locales =
    rawLanguages.data.elements?.map((language) => ({
      id: language.localeId,
      languageId: language.id,
      iso: swTranslated(language.locale, 'code') ?? swTranslated(language.translationCode, 'code'),
    })) ?? [];

  // TODO cache
  return {
    currencies,
    salutations,
    countries,
    locales,
  };
};
