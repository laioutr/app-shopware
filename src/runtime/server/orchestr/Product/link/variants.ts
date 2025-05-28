import { ProductVariantsLink } from '@laioutr-core/canonical-types/query';
import type { components } from '../../../types/storeApiTypes';
import { defineShopwareLink } from '../../../action/defineShopwareAction';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context }) => {
  const shopwareProducts = [] as components['schemas']['Product'][];

  return {
    links: Object.fromEntries(
      shopwareProducts.map((product) => [
        product.id,
        {
          entityIds: product.children?.map((child) => child.id) ?? [product.id],
        },
      ])
    ),
    customData: {
      shopware: shopwareProducts,
    },
  };
});
