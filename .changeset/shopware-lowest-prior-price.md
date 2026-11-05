---
'@laioutr/app-shopware': minor
---

Variant prices carry the Omnibus lowest prior price, and savings percentages read the same everywhere.

- `ProductVariantPrices.lowestPriorPrice` is Shopware's regulation price — the lowest price over the prior period the shop configures (30 days by default), which EU price-indication rules require next to an announced reduction. It is absent where the shop has none configured.
- `savingsPercent` on product, variant and quantity-tier prices is a whole percent, rounded down, so a badge never claims more than the actual discount. It used to be an unrounded fraction such as `46.99999`.
- Quantity-tier `savingsPercent` is now the saving against the single-unit price, as canonical-types defines it. It used to be the tier price as a share of that price, so a 10 % discount read as `90`.
