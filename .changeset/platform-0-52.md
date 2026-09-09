---
'@laioutr/app-shopware': minor
---

**Breaking:** the app now requires `@laioutr-core/orchestr`, `@laioutr-core/frontend-core`, `@laioutr-core/core-types` and
`@laioutr-core/kit` at 0.52.0 or newer, and `@laioutr-core/canonical-types` at 0.33.0 or newer. A project still on an
older platform release cannot install this version.

```jsonc
// before
"@laioutr-core/orchestr": ">=0.40.3"
// after
"@laioutr-core/orchestr": ">=0.52.0"
```

Platform 0.52 reshaped the cache store an app writes through, and the app's own caches — product parent ids, SEO url
lookups and Shopware's system entities — move with it. Entries go stale on exactly the same schedule as before.

One behavioural difference reaches the storefront: a cache write no longer holds up the response. The store schedules it
behind the request, so a slow or failing write costs a request nothing where it previously either delayed it or surfaced
as an error.
