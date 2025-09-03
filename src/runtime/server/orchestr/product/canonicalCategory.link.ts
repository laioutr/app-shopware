import { LinkSingle } from '#orchestr/types';
import { ProductCanonicalMenuItemLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(ProductCanonicalMenuItemLink, async ({ context, entityIds }) => {
  const response = await context.storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: entityIds,
      associations: {
        mainCategories: {},
      },
      includes: { product: ['id', 'categoryIds', 'seoCategory', 'mainCategories'] },
    },
  });

  return {
    links: (response.data.elements ?? []).map(
      (rawProduct) =>
        ({
          sourceId: rawProduct.id,
          targetId: (rawProduct.seoCategory?.id as string | undefined) ?? rawProduct.mainCategories?.[0]?.id ?? rawProduct.categoryIds?.[0],
        }) as LinkSingle
    ),
  };
});
