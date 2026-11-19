---
'@laioutr/app-shopware': minor
---

`CartBase.customFields` carries the cart's `extensions`, which Shopware plugins fill — a minimum order value per shipping method, bonus points. Name them under `cart` in the `customFields` setting, and each arrives without the `apiAlias` Shopware adds; nothing is exposed while the list is empty.

```jsonc
{ "customFields": { "cart": { "include": ["minimumOrderValueDifference"] } } }
// CartBase.customFields → { minimumOrderValueDifference: { difference: 12.5 } }
```
