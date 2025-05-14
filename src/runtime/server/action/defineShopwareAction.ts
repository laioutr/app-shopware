import { defineAction } from '#imports';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { shopwareClientFactory } from '../client/shopwareClientFactory';
import { getSystemIds } from '../shopware-helper/system/getSystemIds';

export const defineShopwareAction = defineAction
  .meta({
    app: '@laioutr-core/shopware',
  })
  .use(async (args, next) =>
    next({
      context: {
        storefront: shopwareClientFactory(),
        admin: shopwareAdminClientFactory(),
      },
    })
  )
  .use(async (args, next) =>
    next({
      context: {
        systemIds: await getSystemIds(args.context.storefront),
      },
    })
  );
