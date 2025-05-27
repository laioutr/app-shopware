import { SwSystemEntities } from './getSystemEntities';
import { ClientEnv } from '@laioutr-core/orchestr/types';

export const getCurrentSystemEntities = (systemIds: SwSystemEntities, clientEnv: ClientEnv) => {
  const clientLocale = new Intl.Locale(clientEnv.locale);
  const locale = systemIds.locales.find((locale) => locale.iso === clientEnv.locale) ?? systemIds.locales[0];
  const currency = systemIds.currencies.find((currency) => currency.iso === clientEnv.currency) ?? systemIds.currencies[0];
  const country = systemIds.countries.find((country) => country.iso === clientLocale.region) ?? systemIds.countries[0];

  return {
    locale,
    currency,
    country,
  };
};
