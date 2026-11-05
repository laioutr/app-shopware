import { defineOrchestr, useNitroApp } from '#imports';
import type { ResolveCriteria } from '../types/criteria';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { getShopwareContext } from '../context/getShopwareContext';
import { defaultShopwareSettings } from '../shopware-helper/shopwareSettings';

export const defineShopware = defineOrchestr
  .meta({
    app: '@laioutr-core/shopware',
    logoUrl: '/app-shopware/shopware-logo.svg',
    label: 'Shopware',
  })
  .extendRequest(async (args) => {
    const { storefrontClient, adminClient, systemEntities, currentSystemEntities } = await getShopwareContext(
      args.event,
      args.clientEnv
    );
    const nitro = useNitroApp();

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
        // Without an Admin API integration the client's calls fail with Shopware's auth error,
        // which is what the media library reports on such a shop.
        adminClient: adminClient ?? shopwareAdminClientFactory(),
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
