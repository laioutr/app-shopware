---
'@laioutr/app-shopware': minor
---

Make the Store API reads tunable through two new Nitro hooks.

- `shopware:criteria:resolve` — a filter over the projection and relations of each read that
  hydrates an entity, discriminated by a `target` (`product`, `product-variant`, `category`,
  `menu`, `product-review`). Add `customFields`, pull an extra association, or trim a payload.
- `shopware:settings:resolve` — a filter over what those reads cost and how far they reach:
  `maxLimit` (the shop's `api.max_limit`), `totalCountMode`, `loadVariantsOnListing`,
  `queryTemplateLimit`, `mediaFolderLimit`, and a `catalog` group covering menu depth, the
  listing-page index's membership rules and the SEO route names the slug resolver accepts.

Both are seeded with what the app would otherwise have used, so an app that registers no handler
behaves exactly as before. Neither is exposed as module config: a project's config is on its way to
being editable from Studio, and a wrong `includes` value silently empties an entity component.
