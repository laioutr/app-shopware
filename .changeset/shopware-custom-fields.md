---
'@laioutr/app-shopware': minor
---

Shopware custom fields reach the storefront. The `customFields` option whitelists keys per entity, and the app maps the listed ones unchanged into `ProductBase.customFields`, `ProductVariantBase.customFields`, `CategoryBase.customFields` and the `customFields` of the customer `CustomerGetCurrentAction` answers. Product, variant and category values are the translated ones; a customer's come as stored, since Shopware does not translate them. `*` matches any run of characters. Nothing is exposed until a key is listed.

```jsonc
// laioutrrc.json → apps[@laioutr/app-shopware].config
{
  "customFields": {
    "product": { "include": ["energyLabel", "gpsr_*"] },
    "variant": { "include": ["datasheet"] },
    "category": { "include": ["teaser"] },
    "customer": { "include": ["loyaltyTier"] }
  }
}
```
