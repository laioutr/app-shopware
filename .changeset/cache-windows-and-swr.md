---
'@laioutr/app-shopware': minor
---

Catalogue reads are cached, and a cached answer is served while it refreshes behind the response.
Every query, link and component resolver the app exposes for categories, menus, products and reviews
now carries a window sized to how fast the data behind it moves: a day for product and review copy,
an hour for category structure and breadcrumbs, ten minutes for menus and for the variants a product
sells, five minutes for a category listing. Prices and the default variant a product tile renders
carry fifteen minutes and go stale after one, so an upstream outage cannot keep quoting yesterday's
price for the rest of the day. Variant availability is never served from a cache, because stock is
what a visitor acts on directly.

Where a handler serves stale, a window closing costs no visitor a slow request: the entry answers
immediately and the refresh runs behind the response. A refresh that fails keeps the last good value
until the stale window closes, rather than falling through to an upstream that is already failing.

Nothing personal or live is cached — the cart, customer lookups, product search and search
suggestions reach Shopware on every request as before.

Two correctness fixes come with it. The menu query replays its passthrough on a cache hit: the menu
component resolver requires the categories the query collects, and a hit that skipped the handler
threw once the resolver's own entry had expired. The product queries replay theirs for the same
reason — the product resolver reads a product's default variant from it, and without the replay a
cache hit resolved the parent, whose prices and media differ.

A category listing that comes back empty is no longer written to the cache. Nothing distinguishes a
transient upstream failure from a category that is genuinely empty, and caching the first would serve
an empty category for the whole window.

**Breaking:** the app now requires `@laioutr-core/orchestr`, `@laioutr-core/frontend-core`,
`@laioutr-core/core-types` and `@laioutr-core/kit` at 0.56.0 or newer. A project still on an older
platform release cannot install this version.

```jsonc
// before
"@laioutr-core/orchestr": ">=0.52.0"
// after
"@laioutr-core/orchestr": ">=0.56.0"
```

Platform 0.54 reshaped a query and link cache config, and 0.55 changed how a link cache is keyed, so
this release cannot run on an older one. Link entries a previous version wrote are keyed differently
and are never read again; they expire on their own schedule, and the first requests after the upgrade
miss.
