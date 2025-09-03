import { LinkMulti } from '#orchestr/types';
import { ProductReviewsLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(ProductReviewsLink, async ({ entityIds, context, pagination }) => {
  const { storefrontClient } = context;

  const productToReviews: Record<string, string[]> = {};

  await Promise.all(
    entityIds.map(async (entityId) => {
      const response = await storefrontClient.invoke('readProductReviews post /product/{productId}/reviews', {
        pathParams: { productId: entityId },
        body: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      productToReviews[entityId] = (response.data.elements ?? []).map((element) => element.id);
    })
  );

  return {
    links: Object.entries(productToReviews).map(([productId, reviewsIds]) => ({ sourceId: productId, targetIds: reviewsIds }) as LinkMulti),
  };
});
