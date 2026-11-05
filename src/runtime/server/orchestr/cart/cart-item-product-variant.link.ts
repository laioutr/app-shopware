import { CartItemProductVariantLink } from '@laioutr-core/canonical-types/ecommerce';
import type { Schemas } from '../../types/storeApiTypes';
import { cartFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { getCart } from '../../shopware-helper/getCart';

/**
 * The variant behind a product line item, read off the cart the request already holds. A product
 * line item's `referencedId` is the Shopware product row it sells — the variant, or a product
 * without variants, which is its own single variant. Promotion items have no variant and no link.
 */
export default defineShopwareLink(CartItemProductVariantLink, async ({ entityIds, context, passthrough }) => {
  const cart = passthrough.get(cartFragmentToken) ?? (await getCart(context.storefrontClient));
  passthrough.set(cartFragmentToken, cart);

  const lineItemsById = new Map<string, Schemas['LineItem']>(
    (cart.lineItems ?? []).map((lineItem: Schemas['LineItem']) => [lineItem.id, lineItem])
  );

  return {
    links: entityIds.flatMap((id) => {
      const lineItem = lineItemsById.get(id);
      return lineItem?.type === 'product' && lineItem.referencedId ? [{ sourceId: id, targetId: lineItem.referencedId }] : [];
    }),
  };
});
