import { CreateReviewAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';

export default defineShopwareAction(CreateReviewAction, async ({ context, input }) => {
  try {
    const { productId, name, email, title, content, points } = input;

    const res = await context.storefrontClient.invoke('saveProductReview post /product/{productId}/review', {
      pathParams: { productId },
      body: { name, email, title, content, points },
    });

    return { success: res.status === 200 };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});
