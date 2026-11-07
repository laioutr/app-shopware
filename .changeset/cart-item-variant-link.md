---
'@laioutr/app-shopware': minor
---

Cart line items link to their `ProductVariant` through `CartItemProductVariantLink`, so a cart row can render live variant data such as options, stock, media and the product link. The link is read from the cart the request already loaded, with no extra Store API call. Promotion lines have no variant and resolve no link.
