---
'@laioutr/app-shopware': minor
---

Products carry their Shopware properties and marketing flags.

- `ProductSpecifications` lists the product's properties, one row per property group in Shopware's own order, leaving out groups hidden from the detail page. English and German names for common groups (weight, dimensions, material, …) get a `wellKnownName`. The properties are read only when the component is requested, so listings stay as small as before; a `product-properties` target in `shopware:criteria:resolve` widens that read.
- `ProductFlags` is no longer empty: it holds `new`, `topseller` and `sale` as Shopware marks them. The new `shopware:product-flags:resolve` filter hook localises the English labels, or drops and adds flags.
