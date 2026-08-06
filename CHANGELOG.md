# @laioutr-app/shopware

## 0.14.2

### Patch Changes

- Updated dependencies [dfed458]
  - @laioutr-core/frontend-core@0.40.1
  - @laioutr-core/kit@0.40.1
  - @laioutr-core/core-types@0.40.1
  - @laioutr-core/canonical-types@0.27.2

## 0.14.1

### Patch Changes

- Updated dependencies [3ce84a4]
  - @laioutr-core/frontend-core@0.40.0
  - @laioutr-core/kit@0.40.0
  - @laioutr-core/core-types@0.40.0
  - @laioutr-core/canonical-types@0.27.1

## 0.14.0

### Minor Changes

- 5811cbe: Add a product-listing page index backed by categories, so category pages are enumerable, searchable, countable and locatable.

  Category SEO slugs are normalised — Shopware appends a trailing slash that catch-all route params never carry, which previously made most category slugs unresolvable. The category resolver, the menu query and the products-by-category query templates request SEO URLs, so category links use the store's SEO paths instead of `<name>-<id>`. Existing `<name>-<id>` URLs continue to resolve.

- dd91aa9: Implement the `Child Categories` link (`Category → Category`), so a section can render the current category's sub-categories — bind the Category Card Slider's category source to it in Studio. Children arrive in the order the shop defines, restricted to the categories it shows in navigation, and carry every category component.

  Category media is no longer empty when a category is resolved by id rather than through the navigation menu. The store API returns the media association only when it is asked for, and the category resolver did not ask for it.

### Patch Changes

- Updated dependencies [f644aab]
- Updated dependencies [3332842]
  - @laioutr-core/canonical-types@0.27.0
  - @laioutr-core/core-types@0.39.0
  - @laioutr-core/frontend-core@0.39.0
  - @laioutr-core/kit@0.39.0

## 0.13.5

### Patch Changes

- Updated dependencies [c686645]
  - @laioutr-core/frontend-core@0.38.3
  - @laioutr-core/kit@0.38.3
  - @laioutr-core/core-types@0.38.3
  - @laioutr-core/canonical-types@0.26.7

## 0.13.4

### Patch Changes

- Updated dependencies [5a507db]
  - @laioutr-core/canonical-types@0.26.6

## 0.13.3

### Patch Changes

- Updated dependencies [452faef]
  - @laioutr-core/frontend-core@0.38.2
  - @laioutr-core/kit@0.38.2
  - @laioutr-core/core-types@0.38.2
  - @laioutr-core/canonical-types@0.26.5

## 0.13.2

### Patch Changes

- 84c4dae: Add `listPagesFrom` for page-index enumerations that cannot finish in one request.

  `paginate` takes an optional `startCursor` and exposes `cursor` / `consumedSinceCursor`, so a walk can
  report where it stopped. `listPagesFrom(token, { take, resumeFrom })` builds on that: it returns a
  stream with an `endCursor` the caller persists to continue later. Collecting each pass's `endCursor`
  yields independently servable shards, which is what a sharded sitemap needs.

  It is cursor-addressed and never touches the page-index chunk cache, so no TTL bounds a consumer's
  progress across visits. `listPages` is unchanged and keeps serving the cached enumeration exactly as
  before.

  Page-index handlers receive an optional `startCursor`; pass it to `paginate` to become resumable.
  Ignoring it keeps today's behaviour, but `listPagesFrom` throws for such a handler rather than
  silently restarting at entry 0 on every pass. Both shipped product connectors are resumable.

- Updated dependencies [eaa8098]
  - @laioutr-core/core-types@0.38.1
  - @laioutr-core/canonical-types@0.26.4
  - @laioutr-core/frontend-core@0.38.1
  - @laioutr-core/kit@0.38.1

## 0.13.1

### Patch Changes

- b10447c: Stop bundling a copy of `h3`'s type declarations into the published module types. `H3Event` now resolves from the host app's own `h3` install, so the Nitro hook signatures (`shopware:context-token:resolve`, `shopware:context-token:changed`) line up with the `H3Event` type used elsewhere in the app instead of a duplicate declared inside this package.

## 0.13.0

### Minor Changes

- d63ddd6: Provide a page index for the product detail page-type, so editors can pick a specific product when linking to or previewing a dynamic product page.

  Products are enumerated from the storefront API with their title, slug and image — Shopify reads title, handle and featured image, Shopware name, slug and cover image — and a search term narrows the list. Shopify reads are scoped to the active locale's language where Shopify publishes that language, and fall back to the shop's default language where it does not, so an unsupported locale returns default-language titles rather than failing. Both connectors also implement `locate`, resolving a product detail page to its subject from the page URL, so Studio can tell which product a preview is showing even when it was reached by clicking a link inside the preview rather than picked from the list.

  Located pages carry their metadata, so Studio names the product being previewed instead of showing its raw route params.

  Neither connector reports per-locale route params — resolving a product's slug in every language costs one translated read per language on both platforms. `locate` therefore omits `locales` rather than returning just the locale it was called in, so hreflang alternates, `og:locale:alternate`, `x-default` and the locale switcher keep filling from the current locale's params instead of treating the product as absent from every other locale.

### Patch Changes

- Updated dependencies [d63ddd6]
- Updated dependencies [d63ddd6]
- Updated dependencies [f788876]
  - @laioutr-core/frontend-core@0.38.0
  - @laioutr-core/core-types@0.38.0
  - @laioutr-core/canonical-types@0.26.3
  - @laioutr-core/kit@0.38.0

## 0.12.0

### Minor Changes

- b84247b: Reflect a storefront login/logout inside the embedded checkout in laioutr's own session. The storefront bridge now sends `laioutr:auth-changed { from, code? }`; the embedded section adopts the customer-bound Shopware session server-side by redeeming the single-use code at `POST /store-api/laioutr/session-adopt` (via the new `/app-shopware/adopt-session` route), or clears the token on logout. The context token is fetched server-to-server and stored in an httpOnly cookie — it never reaches the browser.
- 7c48f1a: Add an embedded Shopware checkout section for Studio. The new "Shopware Checkout" section embeds the storefront checkout in an iframe and speaks the parent side of the `laioutr:*` postMessage bridge shipped by the LaioutrConnector plugin — pinning the storefront origin via the ready/init handshake, auto-sizing the frame from the storefront's resize messages, and navigating to a configurable order-confirmation page (with the order id appended as `?order=`) on checkout completion.

  A new `dynamic` (one-per-project) **Checkout** page type backs the hosting page: the cart's `checkoutLink` now resolves to the merchant's Checkout page instead of doing a full-page redirect to the storefront (the storefront URL must still be configured for the link to appear). The confirmation destination is set per section via an "Order Confirmation Page" link field, which the section resolves and navigates to on `laioutr:checkout-finish`.

- ec9017b: Implement the Shopware cart: nested `CartCost` mapping, a product `CartItem` resolver plus a cart→items link, and `add`/`update`/`remove` line-item actions (each persisting the context-token cookie and surfacing blocking cart errors while logging warnings).

  Checkout uses a same-origin handoff route that mints a single-use, short-lived session-handoff code server-to-server against the `LaioutrConnector` plugin and redirects to the storefront's `connect-session`, so the shopper keeps their cart and the raw Shopware context token never travels through the browser. Both `GetCheckoutUrlAction` and the cart's `checkoutLink` resolve to that route. Adds a `storefrontUrl` module option (required for checkout).

  Products only; discount codes and canonical cart-error mapping are deferred.

  Operational prerequisites: the `LaioutrConnector` plugin must be installed on the storefront; the laioutr origin(s) must be in the plugin's `callbackDomainWildcard` allowlist, or the handoff mint rejects the callbacks; and the store-api access key and the checkout storefront domain must belong to the **same Shopware sales channel** (the cart's context token is sales-channel-scoped — a mismatch fails the handoff with "Handoff was issued for a different sales channel").

- a78cf40: Add context-token extension hooks and configurable checkout callbacks so a project that owns login via an external identity provider can integrate without any identity code in this module.

  - `shopware:context-token:resolve` (Nitro bail hook): supply the `sw-context-token` from your own session store; the cookie remains the fallback.
  - `shopware:context-token:changed` (Nitro notification): fired after the token is persisted, so you can mirror it into your own store.
  - `checkoutLoginCallbackUrl` / `checkoutLogoutCallbackUrl` module options: override the in-checkout login/logout success callbacks (default: the request origin), e.g. to point logout at your provider's RP-logout.

  The hooks only transport the token; establishing the customer binding remains the project's responsibility (a storefront login plugin or a native register/login path).

### Patch Changes

- a429c2f: Clarify the "Order Confirmation Page" field on the Shopware checkout section: leaving the link empty is a supported choice — Shopware's own order confirmation page then renders inside the embedded checkout frame, instead of the visitor being sent to a laioutr page with the order id appended.
- d8f50ad: Restore responsive image thumbnails for Shopware media. A leftover demo override returned only the full-size image URL for any asset without an Adobe CDN custom field, which dropped every generated thumbnail from the encoded source. Thumbnails are now encoded in the source again, so responsive rendering picks the right size instead of always loading the full image.
- 534cea6: Make the embedded Shopware checkout work on a first/direct visit. The checkout handoff route now bootstraps a guest `sw-context-token` when the visitor has none — instead of bouncing to the site root — so the storefront loads for a fresh shopper (an empty guest cart). The parent postMessage bridge also completes its handshake proactively on mount, fixing a race where a server-rendered iframe that finished loading before hydration would miss the storefront's one-shot `ready` and never connect.
- d8f50ad: Fix the Shopware media library so assets appear correctly in the Studio media picker:

  - Assets with no alt text are no longer dropped. Shopware returns `null` for an unset `alt`, which failed canonical media validation and made every such asset disappear — so the picker showed folders but no files. The adapter now maps an unset `alt` to `undefined`.
  - File tiles now show their filename, recomposed from Shopware's base name and extension (e.g. `swag_paypal_paypal.svg`); it was previously missing.
  - Alt text falls back to the asset's Shopware title when `alt` is unset.
  - A search no longer returns folder tiles — results are a flat asset list (folder-scoped search doesn't recurse into subfolders, and whole-library search already returned none).

## 0.11.2

### Patch Changes

- Updated dependencies [60ea122]
- Updated dependencies [cd2e51e]
- Updated dependencies [5e4342b]
  - @laioutr-core/frontend-core@0.37.1
  - @laioutr-core/kit@0.37.1
  - @laioutr-core/canonical-types@0.26.2

## 0.11.1

### Patch Changes

- Updated dependencies [72137a7]
  - @laioutr-core/frontend-core@0.37.0
  - @laioutr-core/canonical-types@0.26.1
  - @laioutr-core/kit@0.37.0

## 0.11.0

### Minor Changes

- a0df5b7: Follow the reshaped `ecommerce/cart/add-items` contract: handlers now return the per-item batch outcome (`{ items }`), reporting unresolved `sku` rows as rejected (`not-supported`) instead of dropping them. The Shopify `customer/address-get-all` handler returns the new `{ id, address }` row shape (address ids were previously stripped by the schema).

### Patch Changes

- Updated dependencies [26c6a9d]
- Updated dependencies [125d5de]
- Updated dependencies [5cd1a99]
- Updated dependencies [e57e670]
- Updated dependencies [66af5c0]
- Updated dependencies [3416d47]
- Updated dependencies [ca2aa8a]
- Updated dependencies [fe1007a]
- Updated dependencies [948df8c]
- Updated dependencies [317d1d0]
- Updated dependencies [6e3f5a5]
  - @laioutr-core/canonical-types@0.26.0
  - @laioutr-core/frontend-core@0.36.0
  - @laioutr-core/kit@0.36.0

## 0.10.1

### Patch Changes

- Updated dependencies [3df5972]
  - @laioutr-core/frontend-core@0.35.1
  - @laioutr-core/kit@0.35.1
  - @laioutr-core/canonical-types@0.25.3

## 0.10.0

### Minor Changes

- e072c7a: **Breaking:** Media libraries are now connected as an Orchestr integration facet. A connector declares static capabilities (search, tags, folders, sorts, upload transfer) and uses opaque-cursor pagination, explicit type/tag filtering, optional folder navigation, and proxied or staged upload with per-file results. Define one on the app's Orchestr builder instead of the standalone factory:

  ```ts
  // Before
  export default defineMediaLibraryProvider({ name, label, iconSrc, list, upload });

  // After
  export default defineShopify.mediaLibrary({
    capabilities: { search: true, folders: false, sorts, upload: { transfer: 'staged' } },
    list,
    createUploadTargets,
    finalizeUploads,
  });
  ```

  `defineMediaLibraryProvider()` still works as a **deprecated shim** — existing connectors keep registering without a rewrite, in a degraded mode (no folders, no staged upload, no declared sorts). `ProjectFrontendContext.mediaLibraries` now carries descriptors `{ id, label, iconSrc, capabilities }`.

  The Shopify connector uploads via staged targets and blocks until each file is `READY` before returning it (one failed file no longer sinks the batch). The Shopware connector gains folder browsing over the real media-folder tree.

  This frontend-core version is the threshold for the Cockpit `mediaLibraryV2` capability gate; the Cockpit media picker is updated separately to speak the new contract.

  Folder browsing is folded into the single `list` method: `MediaListResult.folders` carries the
  queried location's subfolders on the first (cursorless) page; the separate `browseFolders`
  method and `media-folders` route are removed. Every media source now carries an optional
  `origin` (`{ libraryId, externalId? }`), stamped by the `.mediaLibrary()` wrapper, which also
  validates all adapter output at the trust boundary (canonical Zod parse, URL-scheme guard —
  including nested poster/cover images — capability/response agreement) and logs a server-side
  warning for every dropped item. Browse items may carry a transient `status`
  (`processing`/`failed`) surfaced in the picker grid.

  Media-library handlers now receive the per-request context built by the app's `extendRequest`
  initwares as their second argument — `list(query, ctx)` — so adapters use the initware-provided
  clients instead of constructing their own. `MediaQuery` gains `scope: 'folder' | 'all'` to
  distinguish a whole-library search from browsing the root level (on Shopware, root holds only
  unfiled assets), and both bundled adapters now honor `MediaQuery.type` server-side.

### Patch Changes

- Updated dependencies [e072c7a]
  - @laioutr-core/frontend-core@0.35.0
  - @laioutr-core/canonical-types@0.25.2
  - @laioutr-core/kit@0.35.0

## 0.9.21

### Patch Changes

- Updated dependencies [1ca1228]
- Updated dependencies [fed75c6]
- Updated dependencies [b33b105]
  - @laioutr-core/frontend-core@0.34.0
  - @laioutr-core/canonical-types@0.25.1
  - @laioutr-core/kit@0.34.0

## 0.9.20

### Patch Changes

- Updated dependencies [5f65b04]
  - @laioutr-core/canonical-types@0.25.0

## 0.9.19

### Patch Changes

- @laioutr-core/canonical-types@0.24.1
- @laioutr-core/frontend-core@0.33.1
- @laioutr-core/kit@0.33.1

## 0.9.18

### Patch Changes

- Updated dependencies [200c297]
- Updated dependencies [28b3020]
  - @laioutr-core/frontend-core@0.33.0
  - @laioutr-core/canonical-types@0.24.0
  - @laioutr-core/kit@0.33.0

## 0.9.17

### Patch Changes

- Updated dependencies [8a8ecc3]
  - @laioutr-core/frontend-core@0.32.1
  - @laioutr-core/kit@0.32.1
  - @laioutr-core/canonical-types@0.23.3

## 0.9.16

### Patch Changes

- Updated dependencies [1a62ae9]
  - @laioutr-core/frontend-core@0.32.0
  - @laioutr-core/canonical-types@0.23.2
  - @laioutr-core/kit@0.32.0

## 0.9.15

### Patch Changes

- Updated dependencies [ac2311e]
  - @laioutr-core/frontend-core@0.31.1
  - @laioutr-core/canonical-types@0.23.1
  - @laioutr-core/kit@0.31.1

## 0.9.14

### Patch Changes

- Updated dependencies [477d67e]
- Updated dependencies [5b8c5a2]
- Updated dependencies [247d008]
- Updated dependencies [f2b9f56]
  - @laioutr-core/canonical-types@0.23.0
  - @laioutr-core/frontend-core@0.31.0
  - @laioutr-core/kit@0.31.0

## 0.9.13

### Patch Changes

- Updated dependencies [dc8610b]
- Updated dependencies [a82dbb0]
  - @laioutr-core/frontend-core@0.30.3
  - @laioutr-core/canonical-types@0.22.25
  - @laioutr-core/kit@0.30.3

## 0.9.12

### Patch Changes

- Updated dependencies [0262d90]
  - @laioutr-core/frontend-core@0.30.2
  - @laioutr-core/kit@0.30.2
  - @laioutr-core/canonical-types@0.22.24

## 0.9.11

### Patch Changes

- Updated dependencies [e388d8e]
- Updated dependencies [0861f3e]
  - @laioutr-core/frontend-core@0.30.1
  - @laioutr-core/canonical-types@0.22.23
  - @laioutr-core/kit@0.30.1

## 0.9.10

### Patch Changes

- @laioutr-core/canonical-types@0.22.22
- @laioutr-core/frontend-core@0.30.0
- @laioutr-core/kit@0.30.0

## 0.9.9

### Patch Changes

- Updated dependencies [76b6dab]
- Updated dependencies [0e55b6d]
- Updated dependencies [74d7205]
  - @laioutr-core/frontend-core@0.29.0
  - @laioutr-core/canonical-types@0.22.21
  - @laioutr-core/kit@0.29.0

## 0.9.8

### Patch Changes

- @laioutr-core/canonical-types@0.22.20
- @laioutr-core/frontend-core@0.28.15
- @laioutr-core/kit@0.28.15

## 0.9.7

### Patch Changes

- Updated dependencies [a568e16]
- Updated dependencies [0efa2c3]
- Updated dependencies [6e7f199]
  - @laioutr-core/frontend-core@0.28.14
  - @laioutr-core/canonical-types@0.22.19
  - @laioutr-core/kit@0.28.14

## 0.9.6

### Patch Changes

- Updated dependencies [5913b0a]
  - @laioutr-core/frontend-core@0.28.13
  - @laioutr-core/kit@0.28.13
  - @laioutr-core/canonical-types@0.22.18

## 0.9.5

### Patch Changes

- Updated dependencies [f85aef5]
  - @laioutr-core/frontend-core@0.28.12
  - @laioutr-core/kit@0.28.12
  - @laioutr-core/canonical-types@0.22.17

## 0.9.4

### Patch Changes

- @laioutr-core/frontend-core@0.28.11
- @laioutr-core/kit@0.28.11
- @laioutr-core/canonical-types@0.22.16

## 0.9.3

### Patch Changes

- Updated dependencies [ba4abcf]
  - @laioutr-core/frontend-core@0.28.10
  - @laioutr-core/kit@0.28.10
  - @laioutr-core/canonical-types@0.22.15

## 0.9.2

### Patch Changes

- d907a16: Product breadcrumb link now returns inline BreadcrumbItem entities with name and link data instead of a bare category ID, matching the Shopify implementation pattern. Accepts passthrough data via productsFragmentToken.
- Updated dependencies [9a519a4]
- Updated dependencies [63fc621]
- Updated dependencies [c9eeae7]
  - @laioutr-core/frontend-core@0.28.9
  - @laioutr-core/kit@0.28.9
  - @laioutr-core/canonical-types@0.22.14

## 0.9.1

### Patch Changes

- Updated dependencies [ebb8a6b]
  - @laioutr-core/frontend-core@0.28.8
  - @laioutr-core/kit@0.28.8
  - @laioutr-core/canonical-types@0.22.13

## 0.9.0

### Minor Changes

- 82873ac: Add mock cart-item link handler and include ratingAverage/productReviews in product requested fields.

### Patch Changes

- 66f66cd: SEO URL resolver cache key now includes the Shopware language ID, preventing cross-language cache collisions.
- a2afddf: Improve API docs for RenderLanguage, improve shopware language-code matching
  - @laioutr-core/canonical-types@0.22.12
  - @laioutr-core/frontend-core@0.28.7
  - @laioutr-core/kit@0.28.7

## 0.8.26

### Patch Changes

- Updated dependencies [c669612]
  - @laioutr-core/frontend-core@0.28.6
  - @laioutr-core/kit@0.28.6
  - @laioutr-core/canonical-types@0.22.11

## 0.8.25

### Patch Changes

- Updated dependencies [27744dc]
  - @laioutr-core/frontend-core@0.28.5
  - @laioutr-core/kit@0.28.5
  - @laioutr-core/canonical-types@0.22.10

## 0.8.24

### Patch Changes

- Updated dependencies [65ebb2a]
  - @laioutr-core/frontend-core@0.28.4
  - @laioutr-core/kit@0.28.4
  - @laioutr-core/canonical-types@0.22.9

## 0.8.23

### Patch Changes

- Updated dependencies [6166bee]
  - @laioutr-core/frontend-core@0.28.3
  - @laioutr-core/kit@0.28.3
  - @laioutr-core/canonical-types@0.22.8

## 0.8.22

### Patch Changes

- @laioutr-core/canonical-types@0.22.7
- @laioutr-core/frontend-core@0.28.2
- @laioutr-core/kit@0.28.2

## 0.8.21

### Patch Changes

- Updated dependencies [6b80e5f]
  - @laioutr-core/frontend-core@0.28.1
  - @laioutr-core/kit@0.28.1
  - @laioutr-core/canonical-types@0.22.6

## 0.8.20

### Patch Changes

- Updated dependencies [ed35457]
- Updated dependencies [15d9c2e]
- Updated dependencies [c0ffa0a]
- Updated dependencies [a8d22eb]
- Updated dependencies [da3e855]
- Updated dependencies [15d9c2e]
- Updated dependencies [dbbc4c1]
  - @laioutr-core/frontend-core@0.28.0
  - @laioutr-core/canonical-types@0.22.5
  - @laioutr-core/kit@0.28.0

## 0.8.19

### Patch Changes

- Updated dependencies [0e5e45d]
  - @laioutr-core/frontend-core@0.27.2
  - @laioutr-core/kit@0.27.2
  - @laioutr-core/canonical-types@0.22.4

## 0.8.18

### Patch Changes

- Updated dependencies [5299273]
  - @laioutr-core/frontend-core@0.27.1
  - @laioutr-core/kit@0.27.1
  - @laioutr-core/canonical-types@0.22.3

## 0.8.17

### Patch Changes

- @laioutr-core/frontend-core@0.27.0
- @laioutr-core/canonical-types@0.22.2
- @laioutr-core/kit@0.27.0

## 0.8.16

### Patch Changes

- Updated dependencies [795d87b]
  - @laioutr-core/frontend-core@0.26.1
  - @laioutr-core/kit@0.26.1
  - @laioutr-core/canonical-types@0.22.1

## 0.8.15

### Patch Changes

- Updated dependencies [5724722]
- Updated dependencies [572f4da]
- Updated dependencies [5724722]
- Updated dependencies [5724722]
  - @laioutr-core/canonical-types@0.22.0
  - @laioutr-core/frontend-core@0.26.0
  - @laioutr-core/kit@0.26.0

## 0.8.14

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.21.0
  - @laioutr-core/frontend-core@0.25.0
  - @laioutr-core/kit@0.25.0

## 0.8.13

### Patch Changes

- Updated dependencies [4b5cbab]
  - @laioutr-core/canonical-types@0.20.0
  - @laioutr-core/frontend-core@0.24.0
  - @laioutr-core/kit@0.24.0

## 0.8.12

### Patch Changes

- Updated dependencies [7893d59]
- Updated dependencies [7893d59]
  - @laioutr-core/frontend-core@0.23.1
  - @laioutr-core/canonical-types@0.19.1
  - @laioutr-core/kit@0.23.1

## 0.8.11

### Patch Changes

- Updated dependencies [292540c]
- Updated dependencies [292540c]
- Updated dependencies [292540c]
- Updated dependencies [292540c]
  - @laioutr-core/frontend-core@0.23.0
  - @laioutr-core/canonical-types@0.19.0
  - @laioutr-core/kit@0.7.13

## 0.8.10

### Patch Changes

- ca1c561: Use translated property for ProductVariantOptions

## 0.8.9

### Patch Changes

- Updated dependencies [279130c]
- Updated dependencies [279130c]
  - @laioutr-core/frontend-core@0.22.2
  - @laioutr-core/canonical-types@0.18.0
  - @laioutr-core/kit@0.7.12

## 0.8.8

### Patch Changes

- 85395c1: Links with references are now case-insensitive to their type
- Updated dependencies [85395c1]
  - @laioutr-core/frontend-core@0.22.1

## 0.8.7

### Patch Changes

- Updated dependencies [4a57dca]
- Updated dependencies [4a57dca]
  - @laioutr-core/frontend-core@0.22.0
  - @laioutr-core/canonical-types@0.17.0
  - @laioutr-core/kit@0.7.11

## 0.8.6

### Patch Changes

- Updated dependencies [d07d3ce]
  - @laioutr-core/canonical-types@0.16.0
  - @laioutr-core/frontend-core@0.21.1
  - @laioutr-core/kit@0.7.10

## 0.8.5

### Patch Changes

- Updated dependencies [0cb0336]
- Updated dependencies [0cb0336]
  - @laioutr-core/frontend-core@0.21.0
  - @laioutr-core/canonical-types@0.15.0
  - @laioutr-core/kit@0.7.9

## 0.8.4

### Patch Changes

- @laioutr-core/frontend-core@0.20.6

## 0.8.3

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.20.5

## 0.8.2

### Patch Changes

- @laioutr-core/frontend-core@0.20.4

## 0.8.1

### Patch Changes

- @laioutr-core/frontend-core@0.20.3

## 0.8.0

### Minor Changes

- 2b334e3: Implement passthrough data

## 0.7.12

### Patch Changes

- @laioutr-core/frontend-core@0.20.2

## 0.7.11

### Patch Changes

- @laioutr-core/frontend-core@0.20.1

## 0.7.10

### Patch Changes

- Updated dependencies [655073f]
- Updated dependencies [655073f]
  - @laioutr-core/canonical-types@0.14.0
  - @laioutr-core/frontend-core@0.20.0
  - @laioutr-core/kit@0.7.8

## 0.7.9

### Patch Changes

- @laioutr-core/frontend-core@0.19.5

## 0.7.8

### Patch Changes

- @laioutr-core/frontend-core@0.19.4

## 0.7.7

### Patch Changes

- Updated dependencies [ccc1ce7]
  - @laioutr-core/frontend-core@0.19.3

## 0.7.6

### Patch Changes

- @laioutr-core/frontend-core@0.19.2

## 0.7.5

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.19.1

## 0.7.4

### Patch Changes

- Updated dependencies [56432dc]
- Updated dependencies [56432dc]
  - @laioutr-core/canonical-types@0.13.0
  - @laioutr-core/frontend-core@0.19.0
  - @laioutr-core/kit@0.7.7

## 0.7.3

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.12.1
  - @laioutr-core/frontend-core@0.18.6

## 0.7.2

### Patch Changes

- d937b6e: Fix MenuItem resolver to return valid URLs

## 0.7.1

### Patch Changes

- Fix cache-import

## 0.7.0

### Minor Changes

- Bump minor version

## 0.6.0

### Minor Changes

- Shopware implementation. Minor ui fixes, QoL improvements for orchestr

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.12.0
  - @laioutr-core/frontend-core@0.18.5
  - @laioutr-core/kit@0.7.6

## 0.5.21

### Patch Changes

- @laioutr-core/frontend-core@0.18.4

## 0.5.20

### Patch Changes

- @laioutr-core/frontend-core@0.18.3

## 0.5.19

### Patch Changes

- Updated dependencies [c32b03d]
  - @laioutr-core/frontend-core@0.18.1

## 0.5.18

### Patch Changes

- Updated dependencies [7aa62ab]
  - @laioutr-core/canonical-types@0.10.0
  - @laioutr-core/frontend-core@0.18.0
  - @laioutr-core/kit@0.7.4

## 0.5.17

### Patch Changes

- Updated dependencies [bbdbdb5]
  - @laioutr-core/canonical-types@0.9.3
  - @laioutr-core/frontend-core@0.17.5

## 0.5.16

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.17.4

## 0.5.15

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.9.2
  - @laioutr-core/frontend-core@0.17.3

## 0.5.14

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.9.1
  - @laioutr-core/frontend-core@0.17.2

## 0.5.13

### Patch Changes

- @laioutr-core/frontend-core@0.17.1

## 0.5.12

### Patch Changes

- Updated dependencies [9bc1c89]
  - @laioutr-core/canonical-types@0.9.0
  - @laioutr-core/frontend-core@0.17.0
  - @laioutr-core/kit@0.7.3

## 0.5.11

### Patch Changes

- Updated dependencies [498112a]
  - @laioutr-core/frontend-core@0.16.0

## 0.5.10

### Patch Changes

- Updated dependencies [0057717]
  - @laioutr-core/canonical-types@0.8.0
  - @laioutr-core/frontend-core@0.14.0
  - @laioutr-core/kit@0.7.2

## 0.5.9

### Patch Changes

- Updated dependencies [833af58]
  - @laioutr-core/frontend-core@0.13.0

## 0.5.8

### Patch Changes

- Updated dependencies [66afaf5]
  - @laioutr-core/frontend-core@0.12.0

## 0.5.7

### Patch Changes

- Updated dependencies [217d249]
  - @laioutr-core/frontend-core@0.11.0
  - @laioutr-core/canonical-types@0.7.5
  - @laioutr-core/kit@0.7.1

## 0.5.6

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.9.3

## 0.5.5

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.9.2

## 0.5.4

### Patch Changes

- Updated dependencies
  - @laioutr-core/kit@0.7.0
  - @laioutr-core/frontend-core@0.9.1

## 0.5.3

### Patch Changes

- Updated dependencies
  - @laioutr-core/frontend-core@0.9.0
  - @laioutr-core/canonical-types@0.7.3

## 0.5.2

### Patch Changes

- Updated dependencies
  - @laioutr-core/kit@0.6.0
  - @laioutr-core/frontend-core@0.7.2

## 0.5.1

### Patch Changes

- Fix import paths
- Updated dependencies
  - @laioutr-core/canonical-types@0.7.1
  - @laioutr-core/frontend-core@0.7.1
  - @laioutr-core/kit@0.5.1

## 0.5.0

### Minor Changes

- Bump dependencies

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.7.0
  - @laioutr-core/frontend-core@0.7.0
  - @laioutr-core/kit@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.6.0
  - @laioutr-core/frontend-core@0.6.0
  - @laioutr-core/kit@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.5.0
  - @laioutr-core/frontend-core@0.5.0
  - @laioutr-core/kit@0.4.1

## 0.4.0

### Minor Changes

- Media Library upload handling, improved documentation-generation from canonical-types

### Patch Changes

- Updated dependencies
  - @laioutr-core/canonical-types@0.4.0
  - @laioutr-core/frontend-core@0.4.0
  - @laioutr-core/kit@0.4.0
