import { defineOrchestr, useNitroApp } from '#imports';
import type { ShopwareAdminClient } from '../client/shopwareAdminClientFactory';
import type { ShopwareContext } from '../context/getShopwareContext';
import type { ShopwareVersion } from '../shopware-helper/shopwareVersion';
import type { ResolveCriteria } from '../types/criteria';
import type { ShopwareSettings } from '../types/settings';
import type { defineOrchestrMock } from '@laioutr-core/orchestr/types';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { getShopwareContext } from '../context/getShopwareContext';
import { defaultShopwareSettings } from '../shopware-helper/shopwareSettings';
import { getCachedShopwareVersion } from '../shopware-helper/system/getShopwareVersion';

/**
 * The `context` every handler built from `defineShopware` receives. Named so the published builder
 * type refers to it instead of expanding the Shopware clients into types this package cannot name.
 */
export type ShopwareOrchestrContext = Omit<ShopwareContext, 'adminClient'> & {
  adminClient: ShopwareAdminClient;
  /** The connected shop's release; `undefined` when it cannot be read, which the app treats as current. */
  shopwareVersion: ShopwareVersion | undefined;
  settings: ShopwareSettings;
  resolveCriteria: ResolveCriteria;
};

// `defineOrchestr` reaches the module only as a Nuxt auto-import, which has no type outside a Nuxt
// project; the mock carries its real type into the published declaration.
export const defineShopware = (defineOrchestr as typeof defineOrchestrMock)
  .meta({
    app: '@laioutr-core/shopware',
    logoUrl: '/app-shopware/shopware-logo.svg',
    label: 'Shopware',
  })
  .extendRequest(async (args): Promise<{ context: ShopwareOrchestrContext }> => {
    const shopware = await getShopwareContext(args.event, args.clientEnv);
    const shopwareVersion = await getCachedShopwareVersion(shopware.storefrontClient);
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
        ...shopware,
        // Without an Admin API integration the client's calls fail with Shopware's auth error,
        // which is what the media library reports on such a shop.
        adminClient: shopware.adminClient ?? shopwareAdminClientFactory(),
        shopwareVersion,
        settings: settings.settings,
        resolveCriteria,
      },
    };
  });

export const defineShopwareAction = defineShopware.actionHandler;
export const defineShopwareQuery = defineShopware.queryHandler;
export const defineShopwareLink = defineShopware.linkHandler;
export const defineShopwareComponentResolver = defineShopware.componentResolver;
// Orchestr's public types omit the template-provider type, so the inferred one cannot be named.
export const defineShopwareQueryTemplateProvider: typeof defineShopware.queryTemplateProvider = defineShopware.queryTemplateProvider;
export const defineShopwarePageIndex = defineShopware.pageIndex;
