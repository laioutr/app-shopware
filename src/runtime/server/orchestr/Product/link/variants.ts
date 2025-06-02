import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import type { components } from '../../../types/storeApiTypes';
import { defineShopwareLink } from '../../../action/defineShopwareAction';

export default defineShopwareLink(ProductVariantsLink, async ({ entityIds, context }) => {
  const shopwareProducts = [] as components['schemas']['Product'][];

  return {
    links: shopwareProducts.map((product) => ({
      sourceId: product.id,
      targetIds: product.children?.map((child) => child.id) ?? [product.id],
    })),
  };
});
