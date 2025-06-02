import { ProductReviewsLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../../action/defineShopwareAction';

export default defineShopwareLink(ProductReviewsLink, async ({ entityIds, pagination }) => ({
  links: entityIds.slice(0, 1).map((entityId) => ({
    sourceId: entityId,
    targetIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].slice(pagination.offset, pagination.offset + pagination.limit),
    entityTotal: 10,
  })),
}));
