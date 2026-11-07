import { ProductListItemProductVariantLink } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareLink } from '../../middleware/defineShopware';

/**
 * The entry's id is the product row it holds, which is the variant: a Shopware product without
 * variants is its own single variant, as `ProductVariantsLink` treats it.
 */
export default defineShopwareLink(ProductListItemProductVariantLink, async ({ entityIds }) => ({
  links: entityIds.map((id) => ({ sourceId: id, targetId: id })),
}));
