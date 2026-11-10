---
'@laioutr/app-shopware': minor
---

Search and search suggestions on the Store API are more complete and no longer fail on edge cases.

- `SuggestedSearchProductsLink` is implemented, so a search flyout can show the suggested products as `Product` entities with price and image.
- Product entries in the suggestions carry a `cover`, and a variant's entry is titled by its inherited name instead of an empty one.
- The suggestion answers its `SuggestedSearchBase` (`query`).
- An empty or blank search term answers an empty result instead of an error from Shopware, in both `ProductSearchQuery` and `SuggestedSearchSearchQuery`.
- `ProductSearchQuery` uses the configured `totalCountMode`, as category listings already did.
