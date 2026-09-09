---
'@laioutr/app-shopware': minor
---

Cart discounts reach the storefront. Shopware carries a promotion as a cart line item, and the app kept only line items
of type `product` — so a shop's automatic cart discount, or a code redeemed inside the embedded checkout, vanished on the
way out. The totals were never wrong (Shopware prices the cart with the discount already applied), but the items added up
to more than the subtotal with nothing on the page to account for the difference.

A promotion now resolves as a `CartItem` of type `discount-code`, carrying the promotion's translated name as its title
and its discount as a negative amount. `code` is set for a promotion the customer redeemed and left unset for one the
shop applies on its own, which has no code to show.

`CartAddItemsAction` accepts `{ type: 'discount-code', code }` and redeems it against Shopware. A code that Shopware
turns down comes back as a rejected item — carrying Shopware's own reason and message — rather than as a thrown error,
and every result is reported in input order. Codes were previously dropped without a request, a result row, or an error.

Items the app cannot add (`sku`, `custom`) are now reported as rejected instead of being left out of the result entirely.
