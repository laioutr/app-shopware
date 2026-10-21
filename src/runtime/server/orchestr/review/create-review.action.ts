import { CreateReviewAction } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';

export default defineShopwareAction(CreateReviewAction, async ({ context, input }) => {
  const { productId, name, email, title, content, points } = input;

  // Shopware answers 204 on success and throws an `ApiClientError` for every refusal.
  await context.storefrontClient.invoke('saveProductReview post /product/{productId}/review', {
    pathParams: { productId },
    body: { name, email, title, content, points },
  });

  return { success: true };
});
