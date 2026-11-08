---
'@laioutr/app-shopware': minor
---

Products carry their Shopware properties and marketing flags.

- `ProductSpecifications` lists the product's properties, one row per property group in Shopware's own order, leaving out groups hidden from the detail page. English and German names for common groups (weight, dimensions, material, …) get a `wellKnownName`. The properties are read only when the component is requested, so listings stay as small as before; a `product-properties` target in `shopware:criteria:resolve` widens that read.
- Shopware's native weight, width, height and length lead the specifications as `Measurement` rows with the `wellKnownName` `weight`, `width`, `height` and `length`: weight in kilograms, the measures in the new `dimensionUnit` option, `mm` by default as Shopware's admin labels them, or `cm` for a shop whose data holds centimetres. An unset or zero field makes no row, and a property group with the same `wellKnownName` wins over the native field.
- `ProductFlags` holds the marks Shopware keeps on a product as well-known codes: `new` while its release date is within the shop's "mark as new" days, and `recommended` where the merchant highlights it (Shopware's *Highlight product*, shown as *Tip* in Shopware's storefront). A frontend translates and styles the code; each flag's `name` is English text for a frontend that does not know it. A discount is not a flag: "Sale" comes from `ProductPrices`.
