---
'@laioutr/app-shopware': minor
---

Shopware's cross-selling on the product, so a product page can show "similar products" or "accessories" from Shopware alone. Three links cover it, exported from `@laioutr/app-shopware/runtime` and, for components, from the new client-safe `@laioutr/app-shopware/tokens`:

- `ShopwareProductCrossSellingProductsLink` (`Product` → `Product`): every product of every cross-selling group, group by group in the shop's order, each product once and never the product itself. Bind a product slider on the product page to the page's product query and choose *Cross-selling products (Shopware)*.
- `ShopwareProductCrossSellingsLink` (`Product` → `ProductCrossSelling`): the product's active groups that hold products, each with `ProductCrossSellingBase` (`name`, `position`, `type`).
- `ShopwareCrossSellingProductsLink` (`ProductCrossSelling` → `Product`): one group's products, in the group's own sorting.

Linked products resolve like listing tiles, with price, cover and the variant Shopware answered. The cross-selling of the variant a page shows is read, so a variant's own groups win over its product's. Answers are cached for ten minutes per product, language and currency, and a product whose read fails links nothing and logs a warning without affecting the others.

The package now lists `zod` (`>=3.25.0`) as a peer dependency; every Laioutr project already installs it.

Search and suggestions:

- `SuggestedSearchProductsLink` is implemented, so a search flyout can show the suggested products as `Product` entities with price and image. Product entries carry a `cover`, a variant's entry is titled by its inherited name instead of an empty one, and the suggestion answers its `SuggestedSearchBase` (`query`).
- An empty or blank search term answers an empty result instead of an error from Shopware, in both `ProductSearchQuery` and `SuggestedSearchSearchQuery`.
- `ProductSearchQuery` uses the configured `totalCountMode`, as category listings already did.
