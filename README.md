# Shopware

[![Laioutr][laioutr-src]][laioutr-href]
[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

[Laioutr](https://laioutr.com) App integrating [Shopware 6](https://www.shopware.com) as the
commerce backend for a Laioutr storefront, using Nuxt.

See [laioutr.com](https://laioutr.com) for more information about Laioutr.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

## Features

- Products, categories, menus, reviews and search served through Laioutr's Orchestr layer, mapped
  onto the canonical entity model — so storefront components stay backend-agnostic
- Cart as a first-class entity: add, update and remove items, with server-held Shopware context
  tokens that never reach the browser
- Embedded checkout — the Shopware storefront's own checkout rendered in-page, with a same-origin
  session handoff so the visitor is never bounced to another domain
- Auth bridge: a storefront login or logout inside the embedded checkout propagates back into the
  Laioutr session, and hooks let a host app mirror it into an external IdP
- Page indexes for product detail and category listing pages, so Studio can resolve a URL to the
  entity behind it
- Shopware media as a Laioutr media library, plus a `@nuxt/image` provider that serves Shopware's
  own thumbnails
- Newsletter subscription and review submission as Orchestr actions

## Requirements

- A Shopware 6 instance with the Store API enabled
- An [Admin API integration](https://developer.shopware.com/docs/guides/integrations-api/) — used
  for the media library and for reading the sales channel's currency and language
- [`LaioutrConnector`](https://github.com/laioutr/shopware-laioutr-connector), the companion
  Shopware plugin. Required for checkout: it exposes the `connect-session` route that redeems the
  single-use handoff code and adopts the cart into a storefront session. Without it, product,
  category, menu and search still work; `checkoutLink` and `GetCheckoutUrlAction` do not.

## Configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@laioutr/app-shopware'],
  '@laioutr/app-shopware': {
    endpoint: 'https://shop.example.com/store-api',
    accessToken: 'SWSC...',
    adminEndpoint: 'https://shop.example.com/api',
    adminClientId: 'SWIA...',
    adminClientSecret: '...',
    storefrontUrl: 'https://shop.example.com',
  },
});
```

| Option | Required | Purpose |
| --- | --- | --- |
| `endpoint` | yes | Store API base URL, `https://<host>/store-api`. |
| `accessToken` | yes | Sales channel access token. |
| `adminEndpoint` | yes | Admin API base URL, `https://<host>/api`. |
| `adminClientId` | yes | Admin API integration ID. |
| `adminClientSecret` | yes | Admin API integration secret. |
| `storefrontUrl` | for checkout | Storefront base URL where `LaioutrConnector` is installed. Its origin is exposed publicly so the embedded checkout can pin `postMessage` traffic. |
| `checkoutLoginCallbackUrl` | no | Absolute URL the storefront returns to after a login inside checkout. Defaults to the request origin; point it at the project's IdP login route for external-IdP projects. |
| `checkoutLogoutCallbackUrl` | no | Absolute URL the storefront returns to after a logout inside checkout. Point it at the IdP's RP-logout route so a storefront logout ends the external session too. |

`accessToken`, `adminClientId` and `adminClientSecret` are secrets and stay server-side: they land
in the private runtime config, and only `storefrontUrl`'s origin is exposed publicly. Read them
from the environment rather than committing them to `nuxt.config.ts`.

In a Laioutr project the same options come from the app's `config` object in `laioutrrc.json`,
which the platform passes into this module — the `nuxt.config.ts` form above is for the playground
and for standalone Nuxt apps.

```jsonc
// laioutrrc.json
{
  "apps": [
    {
      "name": "@laioutr/app-shopware",
      "version": "0.14.5",
      "config": { "endpoint": "https://shop.example.com/store-api" }
    }
  ]
}
```

## Tuning the Store API reads

What the app asks Shopware for, and what those reads cost, is reachable through two Nitro hooks
rather than through config. A project's config is on its way to being editable from Studio, and
none of this is an editor's decision: a wrong `includes` value empties an entity component with no
error to trace it back from, and `maxLimit` describes the shop's deployment.

Both are **filter** hooks, seeded with what the app would otherwise have used — register no
handler and every read behaves exactly as it shipped.

### `shopware:criteria:resolve`

Fires once per store-API read that hydrates a canonical entity, carrying the projection and
relations for that read.

```ts
// server/plugins/shopware-criteria.ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('shopware:criteria:resolve', ({ target, result }) => {
    if (target !== 'product') return;

    result.criteria.includes.product.push('customFields');
    result.criteria.associations.properties = { associations: { group: {} } };
  });
});
```

| `target` | Read |
| --- | --- |
| `product` | A product read, composed — the variant branch nested under it has already been through `product-variant`. |
| `product-variant` | A standalone variant read *and* the branch nested inside a product read, so widening variants widens them everywhere. |
| `category` | The category component resolver's read. |
| `menu` | The navigation read behind `MenuByAliasQuery`. |
| `product-review` | The review component resolver's read. |

Reads that hydrate nothing have no target and never fire: the id-only listing queries, both page
indexes, the breadcrumb link and the child-category link. Their payloads never reach a mapper.

`category` and `menu` arrive with an empty `includes` and stay that way unless a handler fills it —
Shopware returns whole rows when a read projects nothing. Putting a field there turns the read into
a whitelist, which is a way to make it *smaller*, not larger.

### `shopware:settings:resolve`

Fires once per Orchestr request, carrying what the reads cost and how far they reach.

```ts
// server/plugins/shopware-settings.ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('shopware:settings:resolve', ({ result }) => {
    result.settings.maxLimit = 25;
    result.settings.totalCountMode = 'next-pages';
    result.settings.catalog.menuDepth = 3;
  });
});
```

| Setting | Default | Purpose |
| --- | --- | --- |
| `maxLimit` | `100` | The shop's `api.max_limit`. Page-index walks and the media library's folder read are clamped to it; a larger `limit` is rejected with a 400. |
| `totalCountMode` | `exact` | `total-count-mode` for product listing reads. `next-pages` is markedly cheaper on a large catalog but leaves the total an estimate. |
| `loadVariantsOnListing` | `true` | Pre-load every variant of every product on a category listing. Off, the variant resolver fetches on demand: smaller listing payloads, one extra read where the listing itself renders a variant picker. |
| `queryTemplateLimit` | `50` | How many categories the Studio query-template picker offers. |
| `mediaFolderLimit` | `500` | Page size for the media library's folder reads. |
| `catalog.menuDepth` | unset | Navigation depth for menu reads. Left unset, Shopware applies its own default of two levels. |
| `catalog.categoryPageIndex.types` | `['page']` | Shopware category `type` values the listing-page index covers. Add `'landing_page'` for shops that serve landing pages as listing pages. |
| `catalog.categoryPageIndex.minLevel` | `1` | Only categories *deeper* than this level are indexed — the default drops the navigation roots the storefront renders as the home page and the footer menu. |
| `catalog.categoryPageIndex.activeOnly` | `true` | Restrict the index to active categories. |
| `catalog.seoRouteNames` | `frontend.detail.page`; `frontend.navigation.page`, `frontend.landing.page` | `seo_url.routeName` values the slug resolver accepts, per entity type. Extend it when a plugin serves detail or listing pages under its own route name. |

## Checkout

`checkoutMode` picks how a shopper reaches the Shopware checkout. It must match the plugin's
**embedded mode** setting — nothing enforces agreement, and a mismatch serves a chrome-less
storefront loading a bridge with no parent frame.

**`embedded`** (the default) frames the storefront on a Laioutr page. The app registers a
`Checkout` page type: tag one page with it in Studio and drop the **Shopware Checkout** section
on it; the cart's `checkoutLink` resolves to that page, so nothing needs to know its slug.

**`redirect`** navigates the browser to the storefront at top level instead. The cart button
links straight to the handoff route and no Studio checkout page is needed — the **Shopware
Checkout** section has no role and warns in dev if placed on a page. Because the shopper is
genuinely top-level on the storefront with a first-party session, redirect-based payment
providers work without any break-out, and `X-Frame-Options: deny` is preserved. Configure the
storefront side in the Shopware admin: turn **embedded mode off**, list the Laioutr domain under
**Allowed callback domains**, and set **Order success page** to the Laioutr page a completed
order should land on. Leave **Checkout page (payment retry)** empty — un-embedded, the storefront
handles a failed payment itself.

Three same-origin routes carry the handoff, all under the app's `/app-shopware/` namespace:

| Route | Purpose |
| --- | --- |
| `GET /app-shopware/checkout` | Mints a single-use handoff code server-side and redirects to the storefront's `connect-session`, which adopts the cart and lands on the confirm page. |
| `POST /app-shopware/adopt-session` | Called by the checkout section when the embedded storefront reports a login or logout, so the new session is adopted (or cleared) server-side. |
| `GET /app-shopware/adopt-session` | Redirect mode only. The storefront bounces the browser here on a login or logout; the code is redeemed into the session cookie and the shopper is sent back to `return-to`, which is honoured only for the configured storefront origin. |

The Shopware context token is held server-side and passed by code, never by URL and never in the
browser — a code is redeemed once and cannot be replayed.

### Session hooks

A host app that owns its own session store can take over token custody through two Nitro hooks:

```ts
// server/plugins/shopware-session.ts
export default defineNitroPlugin((nitro) => {
  // Bail hook: supply the context token from your own store. The cookie is the fallback.
  // Read-only — it must not mint a token.
  nitro.hooks.hook('shopware:context-token:resolve', ({ event, result }) => {
    result.token = mySessionStore.get(event);
  });

  // Fired after the token is persisted (`token` is the new value) or cleared on a
  // storefront logout (`token` is `null`).
  nitro.hooks.hook('shopware:context-token:changed', ({ event, token }) => {
    token ? mySessionStore.set(event, token) : mySessionStore.clear(event);
  });
});
```

## Development

```bash
pnpm install
cp .env.example .env   # point it at a Shopware instance
pnpm dev               # playground on http://localhost:3000
pnpm test
pnpm lint
```

`@laioutr-core/*` and `@laioutr-app/ui` resolve from Laioutr's registry. Before installing, render
the template with your token:

```bash
sed "s|NPM_LAIOUTR_TOKEN|$YOUR_TOKEN|" .npmrc.config > .npmrc
```

Releases go through [changesets](https://github.com/changesets/changesets): run `pnpm changeset` to
describe your change, and merging the generated "Version Packages" PR publishes to npm.

## License

[MIT](./LICENSE.md) — Laioutr GmbH

<!-- Badges -->

[laioutr-src]: https://img.shields.io/badge/Laioutr-App-000?style=flat&labelColor=020420
[laioutr-href]: https://laioutr.com
[npm-version-src]: https://img.shields.io/npm/v/@laioutr/app-shopware/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@laioutr/app-shopware
[npm-downloads-src]: https://img.shields.io/npm/dm/@laioutr/app-shopware.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@laioutr/app-shopware
[license-src]: https://img.shields.io/npm/l/@laioutr/app-shopware.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@laioutr/app-shopware
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
