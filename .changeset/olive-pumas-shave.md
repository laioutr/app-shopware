---
'@laioutr/app-shopware': patch
---

Product review sorting and the star filter take effect. The reviews link declared both inputs and read neither, so
moving a control changed the URL and returned the identical list.

Four sortings map onto the field Shopware orders by: `newest` and `oldest` on the review date, `rating-high` and
`rating-low` on its score. An unrecognised name falls back to Shopware's own order rather than failing the listing. The
`points` filter narrows the list to a single star rating.
