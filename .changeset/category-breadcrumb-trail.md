---
'@laioutr/app-shopware': patch
---

Breadcrumbs show the whole category path, on category and product pages alike.

- **`CategoryBreadcrumbLink`** delivers its items and no longer fails the query it is part of. Before, a query requesting it threw `NonResolvableComponentsError` for `BreadcrumbItem`, so every section bound to the category, such as the category header and navigation, received nothing. The trail lists the category's ancestors below the sales channel's root, then the category itself as the current page.
- **`ProductBreadcrumbLink`** walks every category level down to the product, the current page, where it showed the main category alone.
- **Where the path comes from:** Shopware's own breadcrumb route on Shopware 6.6.7 and later, the release that added it. On older releases, or where that route fails, the path is built from the category tree, below the navigation, service or footer root the category sits under; Shopware 6.5 is never asked for the missing route.
- **Links:** each item carries its translated name; a page links to its category by its SEO URL, a link category to its external URL, and a folder, which has no page, is not linked.

Handlers built with `defineShopware` receive the sales channel's roots as `context.categoryRoots` — `{ navigation, service?, footer? }`, read once a day per shop, or `undefined` while Shopware cannot be reached.
