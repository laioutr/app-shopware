import { ProductListItemProductLink } from '@laioutr-core/canonical-types/ecommerce';
import { wishlistEntryParentsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';

/**
 * The product an entry belongs to: the variant's parent, or the entry's own product when it has no
 * variants. The parents come from the wishlist read when the items link made one in this request;
 * otherwise one projected product read looks them up.
 */
export default defineShopwareLink(ProductListItemProductLink, async ({ entityIds, context, passthrough }) => {
  let parents = passthrough.get(wishlistEntryParentsToken) ?? {};
  const unknown = entityIds.filter((id) => !(id in parents));

  if (unknown.length > 0) {
    const response = await context.storefrontClient.invoke('readProduct post /product', {
      body: { ids: unknown, includes: { product: ['id', 'parentId'] } },
    });
    parents = {
      ...parents,
      ...Object.fromEntries((response.data.elements ?? []).map((product) => [product.id, product.parentId ?? undefined])),
    };
  }

  return {
    links: entityIds.filter((id) => id in parents).map((id) => ({ sourceId: id, targetId: parents[id] ?? id })),
  };
});
