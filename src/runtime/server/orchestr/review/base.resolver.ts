import { ReviewBase } from '@laioutr-core/canonical-types/entity/review';
import { currentProductIdsToken } from '../../const/passthroughTokens';
import { defineShopwareComponentResolver } from '../../middleware/defineShopware';
import { toRequestCriteria } from '../../shopware-helper/criteria';
import { ShopwareProductReview } from '../../types/shopware';

export default defineShopwareComponentResolver({
  label: 'Shopware Product Review Connector',
  entityType: 'Review',
  provides: [ReviewBase],
  resolve: async ({ entityIds, $entity, context, passthrough }) => {
    const currentProductIds = passthrough.get(currentProductIdsToken);

    if (!currentProductIds) throw new Error('Missing `currentProductIdsToken` in passthrough.');

    let entities = [] as ShopwareProductReview[];

    const criteria = await context.resolveCriteria('product-review', {
      includes: { product_review: ['id', 'title', 'content', 'points', 'externalUser'] },
      associations: {},
    });

    for (const productId of currentProductIds) {
      const res = await context.storefrontClient.invoke('readProductReviews post /product/{productId}/reviews', {
        pathParams: { productId },
        body: {
          ids: entityIds,
          ...toRequestCriteria(criteria),
        },
      });

      entities = entities.concat(...(res.data.elements ?? []));
    }

    return {
      entities: entities.map((review) =>
        $entity({
          id: review.id,

          base: () => ({
            title: review.title,
            shortContent: review.content,
            createdAt: new Date(review.createdAt),
            rating: review.points,
          }),
        })
      ),
    };
  },
});
