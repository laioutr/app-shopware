---
'@laioutr/app-shopware': patch
---

Product search and category listings page, filter and sort correctly from Shopware 6.5 through 6.7, and several fixes apply on every version.

The app reads the connected shop's Shopware version from its Store API schema, once a day per shop, and pages each read the way that release expects. When the version cannot be read, the app behaves as on the current release.

- **`ProductSearchQuery`** reads `/search-suggest` from Shopware 6.6.10 up to 6.7.3, where `/search` ignores the requested page size, and `/search` on every other release. Shopware 6.5 caches suggest results without the page and the built-in filters, so a second page or a price filter could be answered with another request's results and total, and 6.7.3 and later page suggest results by their own size. Search also applies the chosen sorting now.
- **`ProductsByCategoryIdQuery`** returns the requested page on Shopware 6.5, which answered every page with the first.
- **A page past the last one** reads as an empty page on Shopware 6.7, which answered it with 404 `PRODUCT__LISTING_PAGE_OUT_OF_RANGE` and failed the read.
- **A sorting key the shop does not offer** — stale in a bookmarked URL, or one the merchant has since turned off — falls back to the default sorting on listings and search. Shopware 6.5 failed the whole read with `PRODUCT_SORTING_NOT_FOUND`.
- **Cart tax** counts shipping tax once. Shopware's cart taxes already include it, and it was added a second time.
- **`CustomerGetCurrentAction`** answers the customer's id, name and salutation, which came back empty.
- **`CreateReviewAction`** answers `success: true` for a saved review instead of reporting every one as failed.
- **Reviews** carry the date they were written instead of an invalid date.
- **`ProductsByCategorySlugQuery`** pre-loads every variant of the listed products; variants past the first Store API page were missing.
