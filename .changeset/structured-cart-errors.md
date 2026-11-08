---
'@laioutr/app-shopware': minor
---

Shopware's cart errors reach the storefront as canonical cart messages, which a storefront translates by their well-known `code` — `sold-out`, `quantity-adjusted`, `discount-not-applicable` and the rest.

- **On the cart**, `CartMessages` holds what is about the cart as a whole, such as a blocked shipping method or a code that does not apply, and each line's `CartItemMessages` what is about that line, such as more than is in stock.
- **On a write**, `CartAddItemsAction`, `CartUpdateItemsAction` and `CartRemoveItemsAction` answer `messages` with what Shopware reported, such as a quantity lowered to the stock. A cart error never fails the action.

**Breaking:** `CartAddItemsAction` reports a product Shopware refuses — sold out, not found, more than is in stock — as a rejected item with the message's code as `reason` and its text as `reasonLabel`, instead of failing the whole call. A refused discount code is rejected as `not-found` when it does not exist and as `discount-not-applicable` otherwise, instead of with Shopware's own key.

```ts
// before
try {
  await fetchAction(CartAddItemsAction, input);
} catch {
  // a product was sold out
}
if (item.reason === 'promotion-not-eligible') showCodeHint(item.reasonLabel);

// after
const { items, messages } = await fetchAction(CartAddItemsAction, input);
for (const item of items) {
  if (item.status === 'rejected') showRejection(item.reason, item.reasonLabel); // 'sold-out', 'discount-not-applicable', …
}
```
