---
'@laioutr/app-shopware': patch
---

Product search and category listings page, filter and sort correctly on Shopware 6.5, and several fixes apply on every version.

- **`ProductSearchQuery`** reads Shopware's `/search` instead of `/search-suggest`. Shopware 6.5 caches suggest results without the page and the built-in filters, so a second page or a price filter could be answered with another request's results and total. Search also applies the chosen sorting now.
- **`ProductsByCategoryIdQuery`** returns the requested page on Shopware 6.5, which answered every page with the first.
- **A sorting key the shop does not offer** — stale in a bookmarked URL, or one the merchant has since turned off — falls back to the default sorting on listings and search. Shopware 6.5 failed the whole read with `PRODUCT_SORTING_NOT_FOUND`.
- **Cart tax** counts shipping tax once. Shopware's cart taxes already include it, and it was added a second time.
- **`CustomerGetCurrentAction`** answers the customer's id, name and salutation, which came back empty.
- **`CreateReviewAction`** answers `success: true` for a saved review instead of reporting every one as failed.
- **Reviews** carry the date they were written instead of an invalid date.
- **`ProductsByCategorySlugQuery`** pre-loads every variant of the listed products; variants past the first Store API page were missing.
