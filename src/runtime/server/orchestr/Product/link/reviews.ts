import { ProductReviewsLink } from '@laioutr-core/canonical-types/query';
import { defineShopwareLink } from '../../../action/defineShopwareAction';

export default defineShopwareLink(ProductReviewsLink, async ({ entityIds, pagination }) => ({
  links: {
    [entityIds[0]]: {
      entityIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].slice(pagination.offset, pagination.offset + pagination.limit),
      entityTotal: 10,
    },
  },
}));
