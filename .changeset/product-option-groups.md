---
'@laioutr/app-shopware': minor
---

Products resolve their option axes — the colours, sizes and other choices a product offers, with a swatch per value, in the order the merchant authored the configurator. A listing can render them without loading a single variant.

A product's default variant carries its SKU, its option values, and whether it can be bought. Only the id was set before, so anything needing an item identifier or an add-to-cart decision had to load the product's variants first.

Each variant option reports a well-known name alongside the merchant's own wording, so a consumer can find the colour or size axis without matching on free text.
