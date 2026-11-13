import { GetOwnReviewAction } from '@laioutr-core/canonical-types/ecommerce';
import { adminApiIsConfigured, defineShopwareAction } from '../../middleware/defineShopware';
import { findSessionCustomersReview, toOwnReview } from '../../shopware-helper/ownReview';

export default defineShopwareAction(
  GetOwnReviewAction,
  async ({ context, input }) => {
    const { review } = await findSessionCustomersReview(context, input.productId);

    return { review: review ? toOwnReview(review) : null };
  },
  { isAvailable: adminApiIsConfigured }
);
