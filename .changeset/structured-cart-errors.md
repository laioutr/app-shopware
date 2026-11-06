---
'@laioutr/app-shopware': minor
---

Shopware cart errors reach the storefront in a structured form it can translate: Shopware's message key (`product-stock-reached`, `min-order-quantity`, …), the level (`notice`, `warning` or `error`), the message parameters (`{ name, quantity }`) and whether the error blocks the order.

- The cart lists every error it carries in `CartBase.customFields.cartErrors`, including warnings such as a quantity reduced to the available stock.
- A cart mutation that Shopware refuses fails with `ShopwareCartError`, whose `data.errors` lists the blocking errors. It answers HTTP 422 instead of 500, and the refusal is no longer logged as a server error.
