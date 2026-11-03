---
'@laioutr/app-shopware': minor
---

A product, category or category listing slug that Shopware does not know answers `notFound()`, so its page answers 404 instead of 200 with empty sections, and no error is logged for it. The product and category resolvers report the ids Shopware no longer returns, so a product deactivated after its slug was cached answers 404 too.

**Breaking:** needs `@laioutr-core/orchestr` 0.79.0 or later, which brings `notFound()`.
