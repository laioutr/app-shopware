---
'@laioutr/app-shopware': minor
---

**Breaking:** the app is now open source and publishes as `@laioutr/app-shopware` on public npm
under MIT, instead of `@laioutr-app/shopware` on the Laioutr registry. Both the module specifier
and the `nuxt.config` key derive from the package name, so update both:

```diff
 export default defineNuxtConfig({
-  modules: ['@laioutr-app/shopware'],
-  '@laioutr-app/shopware': {
+  modules: ['@laioutr/app-shopware'],
+  '@laioutr/app-shopware': {
     endpoint: 'https://shop.example.com/store-api',
     accessToken: 'SWSC...',
   },
 });
```

A Nitro handler reading the Shopware session hooks needs no change — `shopware:context-token:resolve`
and `shopware:context-token:changed` keep their names.

`@laioutr-core/canonical-types`, `core-types`, `frontend-core`, `kit` and `orchestr` are now peer
dependencies, so the host project supplies one copy of each rather than the app carrying its own.
