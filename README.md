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

## Checkout

The app registers a `Checkout` page type. Tag one page with it in Studio and drop the
**Shopware Checkout** section on it; the cart's `checkoutLink` resolves to that page, so nothing
in the storefront needs to know its slug.

Two same-origin routes carry the handoff, both under the app's `/app-shopware/` namespace:

| Route | Purpose |
| --- | --- |
| `GET /app-shopware/checkout` | Mints a single-use handoff code server-side and redirects to the storefront's `connect-session`, which adopts the cart and lands on the confirm page. |
| `POST /app-shopware/adopt-session` | Called by the checkout section when the embedded storefront reports a login or logout, so the new session is adopted (or cleared) server-side. |

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

`@laioutr-core/*` and `@laioutr-app/ui` resolve from Laioutr's registry — copy `.npmrc.config` to
`.npmrc` and add your token before installing.

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
