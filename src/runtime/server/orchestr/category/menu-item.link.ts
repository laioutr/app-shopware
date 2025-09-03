import { LinkSingle } from '#orchestr/types';
import { CategoryBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

export default defineShopwareLink(CategoryBreadcrumbLink, async ({ entityIds }) => ({
  links: entityIds.map(
    (id) =>
      ({
        sourceId: id,
        targetId: id,
      }) as LinkSingle
  ),
}));
