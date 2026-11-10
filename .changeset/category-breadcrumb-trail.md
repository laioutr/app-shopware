---
'@laioutr/app-shopware': patch
---

The category breadcrumb (`CategoryBreadcrumbLink`) delivers its items and no longer fails the query it is part of. Before, a query requesting it threw `NonResolvableComponentsError` for `BreadcrumbItem`, so every section bound to the category, such as the category header and navigation, received nothing.

The trail lists the category's ancestors below the sales channel's navigation root, then the category itself as the current page, the way Shopware's own storefront shows it. Each item carries its translated name and a link to its category; a folder category is named but not linked, as it has no page. A category in the service or footer tree starts below that root instead.
