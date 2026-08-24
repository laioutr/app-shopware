---
'@laioutr/app-shopware': patch
---

Fix products disappearing from listings and product pages rendering half-empty on shops that present a
variant rather than the parent product. The product resolver answered under the id of the variant it
read its data from, while every query asks for the parent's id, so those products came back with no
components at all — listings dropped the affected tiles without an error, and a product page opened
through a variant URL lost its title and gallery. Shops configured to show a main variant per product
could lose their entire listing this way.
