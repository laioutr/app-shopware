---
'@laioutr/app-shopware': minor
---

The Shopware customer wishlist is available through the canonical product-list tokens: `ProductListGetWishlistQuery`, `ProductListItemsLink`, `ProductListItemProductLink`, `ProductListItemProductVariantLink`, `ProductListAddItemsAction` and `ProductListRemoveItemsAction`.

Variant ids are stored as given. Removing a bare product also removes the entries for its variants. Guests get `UnauthenticatedError` from the actions. A storefront that keeps a guest list locally can replay it with `ProductListAddItemsAction` after login: it runs on Shopware's `/customer/wishlist/merge` and skips products already on the list.
