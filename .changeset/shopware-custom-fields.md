---
'@laioutr/app-shopware': minor
---

Shopware custom fields reach the storefront. A new `customFields` option whitelists keys per entity, and the app reads them along with the product and maps them unchanged into `ProductBase.customFields` and `ProductVariantBase.customFields`. Values are the translated ones, and `*` matches any run of characters. Nothing is exposed until a key is listed.

```jsonc
// laioutrrc.json → apps[@laioutr/app-shopware].config
{ "customFields": { "product": { "include": ["energyLabel", "gpsr_*"] }, "variant": { "include": ["datasheet"] } } }
```
