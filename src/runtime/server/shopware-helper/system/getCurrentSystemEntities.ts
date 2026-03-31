import { SwSystemEntities, SwSystemLocale } from './getSystemEntities';
import { ClientEnv } from '@laioutr-core/orchestr/types';

const findBestLocale = (swLocales: SwSystemLocale[], clientLocale: string): SwSystemLocale => {
  if (swLocales.length === 0) {
    throw new Error('No locales available');
  }

  // Normalize locale format: replace underscores with hyphens and convert to lowercase
  const normalizeLocale = (locale: string) => locale.replace('_', '-').toLowerCase();

  const normalizedClientLocale = normalizeLocale(clientLocale);
  const normalizedSwLocales = swLocales.map((locale) => ({
    ...locale,
    iso: normalizeLocale(locale.iso),
  }));

  // 1. Exact match (case insensitive, de-DE == de_DE)
  const exactMatch = normalizedSwLocales.find((locale) => locale.iso === normalizedClientLocale);
  if (exactMatch) {
    return swLocales.find((locale) => locale.id === exactMatch.id)!;
  }

  // 2. BCP47/ISO language-part matches (e.g. swLocale=de-DE, clientLocale=de)
  const clientLanguage = normalizedClientLocale.split('-')[0];
  const languageMatch = normalizedSwLocales.find((locale) => {
    const swLanguage = locale.iso.split('-')[0];
    return swLanguage === clientLanguage;
  });
  if (languageMatch) {
    return swLocales.find((locale) => locale.id === languageMatch.id)!;
  }

  // 3. Choose English if available
  const englishMatch = normalizedSwLocales.find((locale) => locale.iso.startsWith('en'));
  if (englishMatch) {
    return swLocales.find((locale) => locale.id === englishMatch.id)!;
  }

  // 4. Fall back to first available
  return swLocales[0];
};

export const getCurrentSystemEntities = (systemIds: SwSystemEntities, clientEnv: ClientEnv) => {
  const clientLocale = new Intl.Locale(clientEnv.locale);
  const locale = findBestLocale(systemIds.locales, clientEnv.locale);
  const currency = systemIds.currencies.find((currency) => currency.iso === clientEnv.currency) ?? systemIds.currencies[0];
  const country = systemIds.countries.find((country) => country.iso === clientLocale.region) ?? systemIds.countries[0];

  return {
    locale,
    currency,
    country,
  };
};
