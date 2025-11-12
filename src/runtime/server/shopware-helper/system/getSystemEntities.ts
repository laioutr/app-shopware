import { useRuntimeConfig, useUserlandCache } from '#imports';
import { StorefrontClient } from '../../types/shopware';
import { swTranslated } from '../swTranslated';

/* declare const storefrontId: string;
declare const cacheSet: (namespace: string, key: string, version: number, tags: string[], data: unknown) => void;

cacheSet('shopware', 'SystemIds', 1, [`storefront:${storefrontId}`], {
  currencies: [],
  salutations: [],
  countries: [],
  locales: [],
});*/

export type SwSystemEntities = Awaited<ReturnType<typeof getSystemEntities>>;

/**
 * Shopware wants us to send ids for certain system entities.
 * This function fetches all of the relevant ones and returns them aggregated for further use.
 */
export const getSystemEntities = async (client: StorefrontClient) => {
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

const SYSTEM_ENTITIES_TTL = 60 * 60 * 24; // 1 day

export const getCachedSystemEntities = async (client: StorefrontClient) => {
  const accessToken = useRuntimeConfig()['@laioutr/app-shopware'].accessToken;
  const cache = useUserlandCache<SwSystemEntities>(`shopware:${accessToken}:system-entities`);
  const cachedSystemEntities = await cache.getItem('default');
  if (cachedSystemEntities) {
    return cachedSystemEntities;
  }
  const systemEntities = await getSystemEntities(client);
  await cache.setItem('default', systemEntities, { ttl: SYSTEM_ENTITIES_TTL });
  return systemEntities;
};
