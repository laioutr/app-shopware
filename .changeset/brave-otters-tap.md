---
'@laioutr/app-shopware': patch
---

Fix carts with shipping or more than one tax rate failing to resolve with "The currency EUR
supports only 2 decimal digits". Cart aggregates are now summed in minor units, so the drift plain
float addition introduces (7.43 + 0.39 === 7.819999999999999) can no longer produce an amount the
currency rejects.
