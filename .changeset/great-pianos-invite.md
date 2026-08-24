---
'@laioutr/app-shopware': patch
---

Fix the price filter on listing and search pages. Its bounds were handed on as Shopware reports
them — a bare decimal — rather than as money, so the filter bar crashed outright on instances that
serialize the price aggregation as a string and filtered against amounts a hundred times too small on
those that use a number. The lower bound was pinned to zero instead of the cheapest product in the
result set. Both bounds are now `{ amount, currency }` in minor units, matching every other price the
app returns.
