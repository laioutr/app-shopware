---
'@laioutr/app-shopware': patch
---

Fix menus failing with `Can not find association by name seoUrls` on Shopware instances whose navigation
route accepts no association beyond the ones it loads itself. The menu query no longer asks that route
for the `seoUrls` association — category slugs come from the `sw-include-seo-urls` header the store API
client already sends, so nothing about the resulting menu changes.
