import { ProductCanonicalCategoryLink } from '@laioutr-core/canonical-types/query';
import { defineShopwareLink } from '../../../action/defineShopwareAction';
import { isLinkSingle } from '../../../orchestr-helper/isLinkSingle';

export default defineShopwareLink(ProductCanonicalCategoryLink, async ({ context, entityIds }) => {
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
        targetId: (rawProduct.seoCategory?.id as string | undefined) ?? rawProduct.mainCategories?.[0]?.id ?? rawProduct.categoryIds?.[0],
      }))
      .filter(isLinkSingle),
  };
});
