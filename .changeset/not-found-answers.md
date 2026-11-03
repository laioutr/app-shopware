---
'@laioutr/app-shopware': minor
---

A product, category or category listing slug that Shopware does not know answers `notFound()`, so its page answers 404 instead of 200 with empty sections, and no error is logged for it. The product and category resolvers report the ids Shopware no longer returns, so a product deactivated after its slug was cached answers 404 too.

**Breaking:** needs `@laioutr-core/orchestr`, `frontend-core`, `core-types` and `kit` 0.79.0 and `@laioutr-core/canonical-types` 0.40.0 or later, which bring `notFound()` and the page subject 404. A project that also runs an older `@laioutr-app/ui` loads a second, older `canonical-types` and can lose the 404, so update it to 2.35.1 or later too.
