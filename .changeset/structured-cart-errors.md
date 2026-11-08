---
'@laioutr/app-shopware': minor
---

Shopware's cart errors reach the storefront as canonical cart messages, which a storefront translates by their well-known `code` — `sold-out`, `quantity-adjusted`, `discount-not-applicable` and the rest — or shows by their `message`, in the request's language from Shopware 6.7.3.

- **On the cart**, `CartMessages` holds what is about the cart as a whole, such as a blocked shipping method or a code that does not apply, and each line's `CartItemMessages` what is about that line, such as more than is in stock. They stand as long as Shopware reports them.
- **On a write**, `CartAddItemsAction`, `CartUpdateItemsAction` and `CartRemoveItemsAction` answer `messages` with what that write changed beyond what it was asked, such as a quantity lowered to the stock. What stands on the cart is not repeated there.
- **`blocksCheckout`** is Shopware's own block flag, also on Shopware before 6.6.7, which does not send it.

**Breaking:** a cart error never fails a cart write. `CartAddItemsAction`, `CartUpdateItemsAction` and `CartRemoveItemsAction` failed with a generic error, answered as a 500, on every error-level cart error — a product sold out, more than is in stock, a lapsed automatic promotion — although Shopware had applied the write. A storefront reads `items[].status` to tell a refused add from an added one: a product Shopware did not put in the cart is rejected with the message's code as `reason` and its text as `reasonLabel`. A refused discount code is rejected as `not-found` when it does not exist and as `discount-not-applicable` otherwise, instead of with Shopware's own key.

```ts
// before
try {
  await fetchAction(CartAddItemsAction, input);
} catch {
  // a product was sold out
}
if (item.reason === 'promotion-not-eligible') showCodeHint(item.reasonLabel);

// after
const { items } = await fetchAction(CartAddItemsAction, input);
for (const item of items) {
  if (item.status === 'rejected') showRejection(item.reason, item.reasonLabel); // 'sold-out', 'discount-not-applicable', …
}

const result = await fetchAction(CartUpdateItemsAction, updates);
for (const message of result?.messages ?? []) showCartMessage(message);
```
