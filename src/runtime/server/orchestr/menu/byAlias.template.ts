import { MenuByAliasQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQueryTemplateProvider } from '../../middleware/defineShopware';

export default defineShopwareQueryTemplateProvider({
  for: MenuByAliasQuery,
  run: async ({ input, context }) => [
    {
      input: {
        alias: 'main-navigation',
      },
      label: 'Main Navigation',
    },
    {
      input: {
        alias: 'service-navigation',
      },
      label: 'Service Navigation',
    },
    {
      input: {
        alias: 'footer-navigation',
      },
      label: 'Footer Navigation',
    },
  ],
});
