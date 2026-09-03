import { LinkMulti } from '#orchestr/types';
import { ProductReviewsLink } from '@laioutr-core/canonical-types/ecommerce';
import { currentProductIdsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';

/**
 * The storefront names its own sortings; each maps to the review field Shopware orders by. An
 * unknown name falls through to Shopware's default order rather than failing the listing.
 */
const REVIEW_SORTINGS: Record<string, { field: string; order: 'ASC' | 'DESC' }> = {
  newest: { field: 'createdAt', order: 'DESC' },
  oldest: { field: 'createdAt', order: 'ASC' },
  'rating-high': { field: 'points', order: 'DESC' },
  'rating-low': { field: 'points', order: 'ASC' },
};

export default defineShopwareLink(ProductReviewsLink, async ({ entityIds, context, pagination, sorting, filter, passthrough }) => {
  const { storefrontClient } = context;

  const sort = sorting ? REVIEW_SORTINGS[sorting] : undefined;

  // Only the star rating is filterable today, and it arrives as the digit the picker showed.
  const points = Number(filter?.points);
  const criteriaFilter = Number.isFinite(points) ? [{ type: 'equals', field: 'points', value: points }] : undefined;

  const productToReviews: Record<string, string[]> = {};

  await Promise.all(
    entityIds.map(async (entityId) => {
      const response = await storefrontClient.invoke('readProductReviews post /product/{productId}/reviews', {
        pathParams: { productId: entityId },
        body: {
          page: pagination.page,
          limit: pagination.limit,
          ...(sort ? { sort: [sort] } : {}),
          ...(criteriaFilter ? { filter: criteriaFilter } : {}),
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
