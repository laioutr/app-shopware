---
'@laioutr/app-shopware': minor
---

Product and variant prices carry the Omnibus lowest prior price, and savings percentages read the same everywhere.

- `ProductVariantPrices.lowestPriorPrice` and `ProductPrices.lowestPriorPrice` are the regulation price the shop enters in Shopware — the lowest price of the prior 30 days, which EU price-indication rules require next to an announced reduction. A product's is the one of the cheapest variant, which sets its `price`. It is absent where the shop has entered none.
- `savingsPercent` on product, variant and quantity-tier prices is a whole percent, rounded down, so a badge never claims more than the actual discount. It used to round to the nearest percent, which read a 19.99 % saving as 20 %.
- Quantity-tier `savingsPercent` is now the saving against the single-unit price, as canonical-types defines it. It used to be the tier price as a share of that price, so a 10 % discount read as `90`.
