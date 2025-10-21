import { defineOrchestr, useUserlandCache } from '#imports';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { shopwareClientFactory } from '../client/shopwareClientFactory';
import { getCurrentSystemEntities } from '../shopware-helper/system/getCurrentSystemEntities';
import { getSystemEntities } from '../shopware-helper/system/getSystemEntities';

export const defineShopware = defineOrchestr
  .meta({
    app: '@laioutr-core/shopware',
    logoUrl: '/app-shopware/shopware-logo.svg',
    label: 'Shopware',
  })
  .use(async (args, next) => {
    const storefrontClient = shopwareClientFactory(args.event);
    const adminClient = shopwareAdminClientFactory();

    const cache = useUserlandCache('shopware_system');
    const systemEntities =
      (await cache.has('system_entities')) ?
        ((await cache.getItem('system_entities')) as Awaited<ReturnType<typeof getSystemEntities>>)
      : await getSystemEntities(storefrontClient);
    await cache.setItem('system_entities', JSON.stringify(systemEntities));

    const currentSystemEntities = getCurrentSystemEntities(systemEntities, args.clientEnv);

    // Set the currency and language headers for the storefront client.
    storefrontClient.defaultHeaders['sw-currency-id'] = currentSystemEntities.currency.id;
    storefrontClient.defaultHeaders['sw-language-id'] = currentSystemEntities.locale.languageId;

    return next({
      context: {
        storefrontClient,
        adminClient,
        systemEntities,
        currentSystemEntities,
        /** The systems current currency iso code */
        swCurrency: currentSystemEntities.currency.iso,
      },
    });
  });

export const defineShopwareAction = defineShopware.actionHandler;
export const defineShopwareQuery = defineShopware.queryHandler;
export const defineShopwareLink = defineShopware.linkHandler;
export const defineShopwareComponentResolver = defineShopware.componentResolver;
export const defineShopwareQueryTemplateProvider = defineShopware.queryTemplateProvider;
