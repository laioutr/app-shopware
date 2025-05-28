import { ProductCanonicalCategoryLink } from '@laioutr-core/canonical-types/query';
import { defineShopwareLink } from '../../../action/defineShopwareAction';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';

export default defineShopwareLink(ProductCanonicalCategoryLink, async ({ context, entityIds }) => {
  const swResponse = await context.storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: entityIds,
      associations: {
        categories: {},
      },
    },
  });
  const shopwareProducts = swResponse.data.elements ?? [];

  return {
    links: matchAndMap(
      entityIds,
      shopwareProducts,
      (id, product) => product.id === id,
      (product) => ({
        entityIds: [...(product.categoryTree ?? [])],
      })
    ),
  };
});

// |01917eb660997291a3f109474638cf8a|01916af8b36d722693574e6f2043a719|01916af93116738dbae146582cc8217b|01916af9dccf7f359fce630ca6f10a9a|
