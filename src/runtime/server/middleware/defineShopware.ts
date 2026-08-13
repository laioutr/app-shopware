import { defineOrchestr, useNitroApp } from '#imports';
import type { ResolveCriteria } from '../types/criteria';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { shopwareClientFactory } from '../client/shopwareClientFactory';
import { defaultShopwareSettings } from '../shopware-helper/shopwareSettings';
import { getCurrentSystemEntities } from '../shopware-helper/system/getCurrentSystemEntities';
import { getCachedSystemEntities } from '../shopware-helper/system/getSystemEntities';

export const defineShopware = defineOrchestr
  .meta({
    app: '@laioutr-core/shopware',
    logoUrl: '/app-shopware/shopware-logo.svg',
    label: 'Shopware',
  })
  .extendRequest(async (args) => {
    const storefrontClient = await shopwareClientFactory(args.event);
    const adminClient = shopwareAdminClientFactory();
    const nitro = useNitroApp();

    const systemEntities = await getCachedSystemEntities(storefrontClient);
    const currentSystemEntities = getCurrentSystemEntities(systemEntities, args.clientEnv);

    // Set the currency and language headers for the storefront client.
    storefrontClient.defaultHeaders['sw-currency-id'] = currentSystemEntities.currency.id;
    storefrontClient.defaultHeaders['sw-language-id'] = currentSystemEntities.locale.languageId;

    const settings = { settings: defaultShopwareSettings() };
    await nitro.hooks.callHook('shopware:settings:resolve', { event: args.event, result: settings });

    const resolveCriteria: ResolveCriteria = async (target, criteria) => {
      const result = { criteria };
      await nitro.hooks.callHook('shopware:criteria:resolve', { event: args.event, target, result });
      return result.criteria;
    };

    return {
      context: {
        storefrontClient,
        adminClient,
        systemEntities,
        currentSystemEntities,
        /** The systems current currency iso code */
        swCurrency: currentSystemEntities.currency.iso,
        settings: settings.settings,
        resolveCriteria,
      },
    };
  });

export const defineShopwareAction = defineShopware.actionHandler;
export const defineShopwareQuery = defineShopware.queryHandler;
export const defineShopwareLink = defineShopware.linkHandler;
export const defineShopwareComponentResolver = defineShopware.componentResolver;
export const defineShopwareQueryTemplateProvider = defineShopware.queryTemplateProvider;
export const defineShopwarePageIndex = defineShopware.pageIndex;
