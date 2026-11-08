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
- Cart as a first-class entity: add, update and remove items, redeem discount codes, and read back
  the shop's automatic cart discounts — with server-held Shopware context tokens that never reach
  the browser; each product line links to its `ProductVariant`, so a cart row can render live
  product data without a second cart read
- Embedded checkout — the Shopware storefront's own checkout rendered in-page, with a same-origin
  session handoff so the visitor is never bounced to another domain
- Auth bridge: a storefront login or logout inside the embedded checkout propagates back into the
  Laioutr session, and hooks let a host app mirror it into an external IdP
- Page indexes for product detail and category listing pages, so Studio can resolve a URL to the
  entity behind it
- Shopware media as a Laioutr media library, plus a `@nuxt/image` provider that serves Shopware's
  own thumbnails
- Customer accounts: login, logout, registration and password recovery as the canonical auth
  actions, with the context token persisted and cleared the same way the embedded checkout does it
- Wishlist: the customer's Shopware wishlist as a canonical `ProductList`, with add and remove
  actions and links from each entry to its product and variant
- Newsletter subscription and review submission as Orchestr actions
- The product's manufacturer as its canonical brand: name and website

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
| `storefrontUrl` | for checkout, registration, password recovery | Storefront base URL where `LaioutrConnector` is installed. Its origin is exposed publicly so the embedded checkout can pin `postMessage` traffic. Shopware also builds the links in its registration, password-reset and newsletter mails from it, so it must be a domain of the sales channel. |
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

## Prices

| Field | Source |
| --- | --- |
| `price` | `calculatedPrice` — for a product, its cheapest variant's where Shopware reports one |
| `strikethroughPrice` | `calculatedPrice.listPrice`, only while it is above the price |
| `savingsPercent` | Saving against the strikethrough price, as a **whole percent rounded down** — a badge never claims more than the actual discount, so 19.99 % reads as 19 %. Quantity tiers use the same rule against the single-unit price. |
| `lowestPriorPrice` (variant) | `calculatedPrice.regulationPrice` — Shopware's lowest price over the prior period the shop configures, which EU price-indication rules require beside an announced reduction. Absent where the shop has none. |

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

## Cart errors

Shopware reports cart problems — stock, quantity rules, a code that does not apply, a blocked
shipping or payment method — as cart errors. The app passes each one on as a canonical
`CartMessage` (`@laioutr-core/canonical-types`), `{ code, level, message?, blocksCheckout? }`:

- `code` is the well-known code for Shopware's message key, or the key itself where there is none
  (`auto-promotion-not-found`, a plugin's own key).

  | Shopware message key | `code` |
  | --- | --- |
  | `product-stock-reached`, warning — Shopware lowered the quantity | `quantity-adjusted` |
  | `product-stock-reached`, error — the lines of one product ask for more than is in stock | `not-enough-stock` |
  | `product-out-of-stock` | `sold-out` |
  | `product-not-found` | `not-found` |
  | `min-order-quantity` | `below-minimum-quantity` |
  | `purchase-steps-quantity` | `invalid-quantity-increment` |
  | `promotion-not-eligible`, with or without its reason suffix, and `promotion-excluded` | `discount-not-applicable` |
  | `promotion-not-found` | `discount-not-found` |
  | `shipping-method-blocked` | `shipping-method-unavailable` |
  | `payment-method-blocked` | `payment-method-unavailable` |

- `level` is Shopware's level 0, 10 or 20 as `info`, `warning` or `error`.
- `message` is Shopware's text in the request's language — its `translatedMessage`, which Shopware
  6.7.3 and later fill from the `checkout.<messageKey>` snippet — or else its English `message`. A
  translation with a placeholder Shopware left unfilled (`%url%`) or with markup from its storefront
  snippets falls back to the English text; a text that still has a placeholder of its own
  (`product-not-found` before 6.7.3) is left out.
- `blocksCheckout` is Shopware's block flag. Shopware before 6.6.7 does not send one, so there it
  is taken from the error class the key belongs to — a blocked shipping or payment method, a
  minimum quantity and purchase steps block at warning level, an unknown code does not block — and
  a key the app does not know blocks at `error` level.

A message carries no numbers. What it refers to is on the line: the quantity Shopware sells in
`CartItemAvailability.quantity`, the limits in `CartItemQuantityRule`.

**On the cart**, `CartMessages` holds the messages that are not about one of its lines — a blocked
shipping method, a code that does not apply — and each line's `CartItemMessages` holds those about
it. Shopware names the line by the product it references. Its promotion errors name no line, so
they are always cart messages, never on a discount line.

**On a mutation**, a cart error never fails the action: Shopware applies the write and reports
what it changed. Add, update and remove items answer `messages` with what that write changed;
update and remove answer nothing when it changed nothing beyond what it was asked. Shopware keeps
no error with the cart, so an error about a change it made — a quantity lowered, a line removed,
a discount added — arrives only there. An error it raises on every calculation stands on the cart
and its lines until it is resolved, and is not repeated in `messages`: a blocked shipping or
payment method, a code that does not apply or is excluded, the lines of one product over the
stock, a missing address or VAT id.

**Adding items** reports each item's outcome, which a storefront reads from `items[].status` to
tell a refused product or code from an added one:

- A product whose line Shopware removed is `rejected` with the `code` of the error about it as
  `reason` and its text as `reasonLabel` — sold out, not found — or with `reason: 'not-orderable'`
  when no error names its line, as for a product with variants.
- A product whose line is in the cart is `added`, also when the lines of one product ask for more
  than is in stock: that stands on the line's `CartItemMessages`. Its `quantity` is what its line
  holds, at most what was asked for — Shopware answers the line's total, so for a product already
  in the cart it can be more than this request added. A quantity Shopware lowered arrives in
  `messages`. An item that added nothing to its line, because the earlier items of the request
  took what it holds, is `rejected` with `reason: 'quantity-adjusted'`.
- A discount code Shopware does not know is `rejected` with `reason: 'not-found'`; any other
  refusal with `reason: 'discount-not-applicable'` and Shopware's text as `reasonLabel`.
  Shopware's promotion errors name no code and its cart holds one error per key, so when two codes
  of one action are refused for the same reason, one refusal stands for both.
- A refusal reported on its item is not repeated in `messages`, also where Shopware raises it
  again in the response to the next code, and a message several requests of one action report
  arrives once.

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

## Wishlist

The app maps Shopware's customer wishlist onto the canonical product-list tokens:
`ProductListGetWishlistQuery`, `ProductListItemsLink`, `ProductListItemProductLink`,
`ProductListItemProductVariantLink`, `ProductListAddItemsAction` and `ProductListRemoveItemsAction`.
The list's id is the customer's id, because Shopware keeps one wishlist per customer.

- **Variants are kept as given.** An item that names a `variantId` is stored as that variant. A
  bare `productId` is stored as the product. Removing a bare product also removes its variants'
  entries, so a listing-page heart can toggle with the product id alone.
- **Guests have no Shopware wishlist.** The query resolves nothing for them, and the actions throw
  `UnauthenticatedError`. Keep a guest's list in the browser and send it with
  `ProductListAddItemsAction` once the visitor has logged in. The action runs on
  `/customer/wishlist/merge`, which skips products already on the list, so the merge is safe to
  repeat.
- Shopware wishlist entries carry no quantity, note or custom fields, so those inputs are not
  kept. The shop must have the wishlist enabled (`core.cart.wishlistEnabled`).

## Exports

### `@laioutr/app-shopware/runtime`

Everything another app needs to call the same Shopware instance — typically a plugin's own store-API
route — in the visitor's session, rather than resolving the context token, language and currency a
second time and drifting from the cart this app holds.

```ts
import { clearContextToken, defineShopware, getShopwareContext, persistContextToken } from '@laioutr/app-shopware/runtime';
import type { ShopwareAdminClient, ShopwareContext, ShopwareOrchestrContext, StorefrontClient } from '@laioutr/app-shopware/runtime';
```

| Export | Purpose |
| --- | --- |
| `defineShopware` | Pre-configured Orchestr builder with Shopware metadata and the request's Shopware context on `context`: everything `getShopwareContext` returns, plus the resolved `settings` and `resolveCriteria`. Chain `.queryHandler()`, `.componentResolver()`, etc. directly on it. |
| `getShopwareContext(event, clientEnv)` | The same context outside an Orchestr handler: the store-API client, the Admin API client (absent without an integration), the store-API `endpoint`, the visitor's `contextToken`, the resolved `languageId`, `currencyId` and ISO `currency`, and `storeApiHeaders()` for routes the typed client does not know. |
| `persistContextToken(event, token)` | Stores a token a store-API write returned and fires `shopware:context-token:changed`. Call it from an action — a read handler's response is already streaming and cannot set the cookie. |
| `clearContextToken(event)` | Drops the token, so the next read starts a guest context. |

```ts
// orchestr/product-variant/live-stock.resolver.ts in another app
import { defineShopware } from '@laioutr/app-shopware/runtime';

export default defineShopware.componentResolver({
  label: 'Live stock',
  entityType: 'ProductVariant',
  provides: [LiveStock],
  resolve: async ({ entityIds, context }) => {
    const stock = await $fetch(`${context.endpoint}/my-plugin/live-stock`, {
      method: 'POST',
      headers: context.storeApiHeaders(),
      body: { ids: entityIds },
    });
    // …
  },
});
```

The token is read exactly as this app reads it: `shopware:context-token:resolve` first, the cookie
second.

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
