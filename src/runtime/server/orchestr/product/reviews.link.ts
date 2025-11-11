import { LinkMulti } from '#orchestr/types';
import { ProductReviewsLink } from '@laioutr-core/canonical-types/ecommerce';
import { currentProductIdsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(ProductReviewsLink, async ({ entityIds, context, pagination, passthrough }) => {
  const { storefrontClient } = context;

  const productToReviews: Record<string, string[]> = {};

  await Promise.all(
    entityIds.map(async (entityId) => {
      const response = await storefrontClient.invoke('readProductReviews post /product/{productId}/reviews', {
        pathParams: { productId: entityId },
        body: {
          page: pagination.page,
          limit: pagination.limit,
          includes: {
            product_review: ['id'],
          },
        },
      });

      const reviewIds = (response.data.elements ?? []).map((element) => element.id);

      productToReviews[entityId] = reviewIds;
    })
  );

  // We need product IDs to be able to fetch reviews using their IDs later on in the resolver
  passthrough.set(currentProductIdsToken, entityIds);

  return {
    links: Object.entries(productToReviews).map(([productId, reviewsIds]) => ({ sourceId: productId, targetIds: reviewsIds }) as LinkMulti),
  };
});
