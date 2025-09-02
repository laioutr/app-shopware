import { ProductCanonicalMenuItemLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../../middleware/defineShopware';
import { isLinkSingle } from '../../../orchestr-helper/isLinkSingle';

export default defineShopwareLink(ProductCanonicalMenuItemLink, async ({ context, entityIds }) => {
  const swResponse = await context.storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: entityIds,
      associations: {
        mainCategories: {},
      },
      includes: { product: ['id', 'categoryIds', 'seoCategory', 'mainCategories'] },
    },
  });
  const shopwareProducts = swResponse.data.elements ?? [];

  return {
    links: shopwareProducts
      .map((rawProduct) => ({
        sourceId: rawProduct.id,
        targetIds: [
          (rawProduct.seoCategory?.id as string | undefined) ?? rawProduct.mainCategories?.[0]?.id ?? rawProduct.categoryIds?.[0],
        ].filter(Boolean) as string[],
      }))
      .filter(isLinkSingle),
  };
});
