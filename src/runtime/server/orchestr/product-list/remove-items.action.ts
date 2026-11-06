import {
  ProductListItemNotFoundError,
  ProductListNotFoundError,
  ProductListRemoveItemsAction,
} from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { entriesToRemove, readWishlist } from '../../shopware-helper/wishlist';

/**
 * Remove products from the customer's wishlist. A named variant removes that entry; a bare product
 * removes the product's own entry and those of its variants. Every item must match an entry, or the
 * call fails before anything is removed.
 */
export default defineShopwareAction(ProductListRemoveItemsAction, async ({ context, input }) => {
  const { storefrontClient } = context;
  if (input.items.length === 0) return;

  const productIds = [...new Set(input.items.flatMap((item) => [item.productId, ...(item.variantId ? [item.variantId] : [])]))];

  // Only the entries the input can match: the named ids themselves and the variants of named products.
  const wishlist = await readWishlist(storefrontClient, {
    page: 1,
    limit: context.settings.maxLimit,
    filter: [
      {
        type: 'multi',
        operator: 'or',
        queries: [
          // The generated filter type takes a single value; `equalsAny` takes a list.
          { type: 'equalsAny', field: 'id', value: productIds as unknown as string },
          { type: 'equalsAny', field: 'parentId', value: productIds as unknown as string },
        ],
      },
    ],
  });

  if (!wishlist) {
    if (input.productListId !== undefined) throw new ProductListNotFoundError(input.productListId);
    // A customer without a wishlist has nothing on it, and no list id to name.
    const [first] = input.items;
    throw new ProductListItemNotFoundError('', first!.productId, first!.variantId);
  }
  if (input.productListId !== undefined && input.productListId !== wishlist.id) throw new ProductListNotFoundError(input.productListId);

  const toRemove = new Set<string>();
  for (const item of input.items) {
    const ids = entriesToRemove(wishlist.entries, item);
    if (ids.length === 0) throw new ProductListItemNotFoundError(wishlist.id, item.productId, item.variantId);
    ids.forEach((id) => toRemove.add(id));
  }

  // One request per entry: the route takes a single product.
  await Promise.all(
    [...toRemove].map((productId) =>
      storefrontClient.invoke('deleteProductOnWishlist delete /customer/wishlist/delete/{productId}', { pathParams: { productId } })
    )
  );
});
