---
'@laioutr/app-shopware': minor
---

Products carry their Shopware properties and marketing flags.

- `ProductSpecifications` lists the product's properties, one row per property group in Shopware's own order, leaving out groups hidden from the detail page. English and German names for common groups (weight, dimensions, material, …) get a `wellKnownName`. The properties are read only when the component is requested, so listings stay as small as before; a `product-properties` target in `shopware:criteria:resolve` widens that read.
- `ProductFlags` holds the marks Shopware keeps on a product as well-known codes: `new` while its release date is within the shop's "mark as new" days, and `bestseller` where it is marked as a topseller. A frontend translates and styles the code; each flag's `name` is English text for a frontend that does not know it. A discount is not a flag: "Sale" comes from `ProductPrices`.
