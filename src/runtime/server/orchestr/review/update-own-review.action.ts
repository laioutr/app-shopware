import { ReviewNotFoundError, UpdateOwnReviewAction } from '@laioutr-core/canonical-types/ecommerce';
import { adminApiIsConfigured, defineShopwareAction } from '../../middleware/defineShopware';
import { findOwnReview, findSessionCustomersReview, toOwnReview, toUpdateBody } from '../../shopware-helper/ownReview';
import { throwAsReviewError } from '../../shopware-helper/reviewErrors';

export default defineShopwareAction(
  UpdateOwnReviewAction,
  async ({ context, input }) => {
    const { productId, title, content, points } = input;

    const { customerId, review: stored } = await findSessionCustomersReview(context, productId);
    if (!stored) throw new ReviewNotFoundError(productId);

    // Shopware moves the review to the product in the path, so it goes to the one the review is on.
    try {
      await context.storefrontClient.invoke('saveProductReview post /product/{productId}/review', {
        pathParams: { productId: stored.productId },
        body: toUpdateBody(stored, { title, content, points }),
      });
    } catch (err) {
      throwAsReviewError(err, productId);
    }

    // Read back: Shopware sanitizes the text on write, and a shop can approve a review as it is saved.
    const saved = await findOwnReview(context.adminClient, customerId, productId);
    if (!saved) throw new ReviewNotFoundError(productId);

    return { review: toOwnReview(saved) };
  },
  { isAvailable: adminApiIsConfigured }
);
