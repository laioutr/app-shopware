# Review: own-review handlers (`@laioutr/app-shopware`) and the review date band-aid (`@laioutr-app/ui`)

Date: 2026-11-12. Independent review; the reviewer did not write the code. Nothing was edited, committed or pushed.

## Scope

- **Change 1**: `/Users/sl/src/app-shopware-worktrees/own-review`, branch `feat/own-review` against `origin/main`
  (`750dda0`), uncommitted. Local-only files ignored as asked: `playground/nuxt.config.ts`, `laioutrrc.json`,
  `tmp-harness/`, `pnpm-lock.yaml`.
- **Change 2**: `/Users/sl/src/laioutr-worktrees/review-submit-feedback`, `packages/ui-app` diff and
  `.changeset/review-date-from-cache.md`.

## How it was checked

- Read every changed and untracked file, and the code they lean on: `getShopwareContext.ts`,
  `shopwareAdminClientFactory.ts`, `shopwareErrors.ts`, `customerAddresses.ts`, `reviews.link.ts`,
  `create-review.action.ts`.
- Shopware behaviour read from source, 6.5.6.1 and 6.7.12.1 (`/Users/sl/src/shopware-6-*/vendor/shopware`):
  `ProductReviewSaveRoute`, `ProductReviewRoute`, `ProductReviewLoader`, `ProductReviewDefinition`,
  `AclCriteriaValidator`, `MissingPrivilegeException`, `QueryStringParser`, `SqlQueryParser`, OAuth
  `ClientRepository`, `CustomerRoute`, the admin's `sw-review/acl`.
- Platform behaviour read from the installed packages: orchestr 0.84.0 (`actionAvailability.js`,
  `actionErrorStatus.js`, the action endpoint, `errorFromUnknown.js`), canonical-types 0.45.0 (the two tokens,
  `OwnReview`, `ReviewNotFoundError`, `Rating`, the Review components), `@shopware/api-client` 1.2.1
  (`createAdminAPIClient`, `ApiClientError`).
- Ran `pnpm vitest run` over `orchestr/review`, `reviewErrors.test.ts` and `shopwareContext.test.ts`:
  4 files, 19 tests, all pass.

## Change 1 — security

No critical or high finding. What holds, verified:

- **The customer id comes from the session only.** `readCustomer` calls `/account/customer` with the visitor's
  context token; the browser sends only `productId`, which sits inside an `or` that is ANDed under
  `customerId = <session customer>` (`ownReview.ts:31-41`). A browser cannot widen the search to another customer.
- **The Admin integration is used read-only.** The write goes through the Store API in the customer's session
  (`update-own-review.action.ts:19`), and Shopware re-checks ownership on save: `EntityExists` on `id` with the
  criteria `customerId = <session customer>` (6.5 and 6.7 `ProductReviewSaveRoute::validate`). Even a wrong search
  result could not change another customer's review.
- **What reaches the browser** from the handlers is the session customer's own title, text, rating and approval.
  `externalEmail` is read from the Admin API only to send it back to Shopware (`toUpdateBody`); `toOwnReview`
  drops it and nothing logs it.
- **Cross-site calls** are refused by orchestr before the handler runs (`refuseCrossSiteRequest` in the action
  endpoint), so the update cannot be triggered from another site.
- **Logs**: orchestr logs an action error of status 500 and above with `name` and `message` only. A Shopware
  `ApiClientError` message carries each error's title and detail, not the request body or headers, so neither the
  OAuth token nor the review text is logged. Mapped refusals (`InvalidFieldError` and the rest) are 4xx and not
  logged.

Defence-in-depth gaps are L-1 and L-2 below.

## Change 1 — findings

### M-1 · Medium · CONFIRMED — an Admin API refusal reaches the caller unattributed, and `isAvailable` cannot catch it

`src/runtime/server/shopware-helper/ownReview.ts:29`, `src/runtime/server/middleware/defineShopware.ts:82`,
`README.md:61,439`, `laioutr.manifest.json` (Admin API description).

**What is wrong.** `findOwnReview` lets the Admin client's `ApiClientError` through unchanged. orchestr answers it
as a 500 with `data.message` = Shopware's text, and logs `Error executing action "ecommerce/product/reviews/get-own"`
with the same message. Nothing names `@laioutr/app-shopware`, the Admin API integration, or what to grant. The
browser receives Shopware's internals, for example
`Failed request - [Forbidden] {"message":"Missing privilege","missingPrivileges":["product_review:read"]}`.

`adminApiIsConfigured` proves only that three settings are filled in, not that the integration may read reviews.
And the search needs more than the README and manifest say: the `product.parentId` filter makes Shopware's
`AclCriteriaValidator` require `product:read` as well as `product_review:read`. The admin's role "Reviews → Read"
carries both (`sw-review/acl/index.js`, `viewer`); a role built by hand or through the API may not.

**Failure scenario.** A shop that already runs the app has an integration set up for the media library and the
currency and language reads. It upgrades to this release. `isAvailable` answers `true`, the review section reads
the customer's review on every product page a logged-in customer opens, and each read answers 500. The merchant
finds error lines naming an action token and a Shopware privilege, and nothing about which integration to change
or where. The visitor sees no review of their own, and the section's console warning is the only trace in the
browser.

**Fix.** Catch around the search in `findOwnReview` and rethrow an error that names the app, the Admin API
integration and the action, with the original as `cause`. On 401 or 403, the message also says what to grant:
"Catalogues → Reviews → Read" in Shopware admin → Settings → System → Integrations (`product_review:read` and
`product:read`). Keep the 500: answering `null` would tell the customer they have no review, and their next
submit would be refused as a second one. Say "Reviews: Read" in the README and the manifest description rather
than "read access to product reviews". Add a test that a 403 `FRAMEWORK__MISSING_PRIVILEGE_ERROR` from the search
comes out as the attributed error.

### M-2 · Medium · CONFIRMED — every own-review call fetches a new Admin API OAuth token

`src/runtime/server/context/getShopwareContext.ts:58`, `src/runtime/server/middleware/defineShopware.ts:68`,
`src/runtime/server/client/shopwareAdminClientFactory.ts:11`; used from `ownReview.ts:29`.

**What is wrong.** The Admin client is built for every request and keeps its token only in its own closure
(`createAdminAPIClient` in `@shopware/api-client` 1.2.1: `sessionData` starts empty, so the first `invoke` posts to
`/oauth/token`). Calls per request are then:

| Action | Upstream calls, in sequence |
| --- | --- |
| `GetOwnReviewAction` | Store API `/account/customer`, Admin `/oauth/token`, Admin `/search/product-review` |
| `UpdateOwnReviewAction` | the three above, then Store API `POST /product/{id}/review` |

On the Shopware side each token is issued through `ClientRepository::validateClient`: a `password_verify` (bcrypt)
of the integration secret, an `UPDATE integration SET last_usage_at` on the one integration row, and a JWT signature.
Before this change the per-request client was used only on rare paths: the Studio media library, and the custom-field
check on shops before 6.6.10.5. This change puts it on a storefront path. `useOwnReview` reads on every product page a
logged-in customer opens, and again after a submit.

**Failure scenario.** A sale brings many logged-in customers to product pages. Every page view costs the shop a bcrypt
verification and a write to the same `integration` row, so concurrent views queue on that row. A logged-in visitor
can also make the shop run one bcrypt per request by calling the action in a loop.

**Fix.** Keep the token for the process, keyed by endpoint and client id. `createAdminAPIClient` takes `sessionData`
and raises `onAuthChange` when it gets a new token. Store that in module scope and pass it to the next client, or
keep one Admin client per process: it carries no per-request state. Shopware issues tokens for 600 s, so that is one
issuance per process per ten minutes. Not acceptable as it stands, because it is a write and a bcrypt on the shop
for each page view, triggered by visitors.

### L-1 · Low · CONFIRMED gap, SUSPECTED reach — the one scope on an Admin search is an unchecked response field

`get-own-review.action.ts:10-11`, `update-own-review.action.ts:13-14`, `ownReview.ts:32`.

**What is wrong.** The Admin search skips every Store API restriction. Its only scope is `customer.id` from the
`/account/customer` answer, and nothing checks that value. Shopware's `QueryStringParser` accepts `value: null` on
`equals`, which becomes `customerId IS NULL`.

**Failure scenario.** A plugin decorating the customer route, a proxy, or a later type drift answers without an `id`,
or with `null`. The search then returns the newest review of the product that has no customer: one created in the
admin or imported. The visitor is shown another person's review title, text and rating as their own. A save is still
refused by Shopware's ownership check.

**Fix.** Before the search, refuse anything that is not a Shopware id: `if (!isShopwareId(customer.id)) throw …`.
`isShopwareId` already exists in `shopware-helper/isShopwareId.ts`. Write it once, in the helper L-5 proposes.

### L-2 · Low · CONFIRMED — a malformed `productId` costs a token, a failed Admin call and an error-level log line

`ownReview.ts:37-38`.

**What is wrong.** `input.productId` is any string. It reaches the Admin API, where `SqlQueryParser` converts an
`FkField` value with `Uuid::fromHexToBytes` and answers 400 `InvalidUuidException` for anything that is not hex. That
400 is not mapped, so the action answers 500 and orchestr logs it at error level.

**Failure scenario.** A logged-in visitor, or a section given a non-Shopware id, sends `productId: "abc"`. Each call
produces an error log entry and a token issuance (M-2). This is noise in the error budget that any account holder
can cause.

**Fix.** `if (!isShopwareId(productId))`: get-own answers `{ review: null }`, and update throws
`ReviewNotFoundError(productId)`, both before any Admin call. `product/byId.query.ts:18` does the same.

### L-3 · Low · CONFIRMED behaviour, SUSPECTED reach — a guest-checkout session counts as a customer

`get-own-review.action.ts:10`, `update-own-review.action.ts:13`, `README.md:440`.

**What is wrong.** Shopware's `/account/customer` sets `LOGIN_REQUIRED_ALLOW_GUEST`, so a context holding a guest
customer passes `readCustomer`. The handlers then search for that guest's reviews. A guest cannot have any: the save
route does not allow guests.

**Failure scenario.** A context token that still holds the guest customer after a guest checkout calls the actions.
Get-own costs a token and a search and answers `null`. Update answers `ReviewNotFoundError`, not the
`UnauthenticatedError` the README promises ("Each throws `UnauthenticatedError` for a guest"). No data is exposed.
Whether a storefront session keeps such a token after the checkout handoff was not verified, hence SUSPECTED.

**Fix.** `if (customer.guest) throw new UnauthenticatedError()` before the search, in the shared helper from L-5.
Alternatively, word the README for this case.

### L-4 · Low · CONFIRMED — the update answers what was sent, not what Shopware stored

`update-own-review.action.ts:28`.

**What is wrong.** The answer echoes the input and fixes `published: false`. Shopware stores `content` through a
`LongTextField` flagged `AllowHtml`, which the DAL sanitizes on write, so markup in the text can be stored
differently from what was sent. A plugin that approves reviews on write (a subscriber to `product_review.written`)
makes `published: false` wrong.

**Failure scenario.** A customer pastes text containing markup. The section shows the echoed text under "Your review"
until the next read, which then shows the sanitized one.

**Fix.** Accept it and say so in the README, which is cheap and matches core Shopware. Alternatively, read the review
again after the save: one more Admin search, without a new token once M-2 is fixed.

### L-5 · Low · CONFIRMED — the same lookup is written twice, and a violation predicate sits beside its sibling

`get-own-review.action.ts:10-11`, `update-own-review.action.ts:13-14`, `reviewErrors.ts:9-10`,
`shopwareErrors.ts` (`hasViolationAt`).

**What is wrong.** Both handlers open with the same two steps: read the customer through `accountCall`, then call
`findOwnReview` with `customer.id`. Every guard from L-1 to L-3 would have to be written into both.
`hasViolation(err, code, pointer)` is a second predicate over Shopware's error entries, next to the existing
`hasViolationAt(err, pointers)` in `shopwareErrors.ts`.

**Fix.** Add one `findSessionCustomersReview(context, productId)` to `ownReview.ts` that reads the customer, applies
the guards and searches. Move `hasViolation` into `shopwareErrors.ts` beside `hasViolationAt`, or give
`hasViolationAt` an optional code.

### L-6 · Low · CONFIRMED mismatch, SUSPECTED effect — peer floors move separately for packages that are pinned together

`package.json:88-94`.

**What is wrong.** The peers require `orchestr >=0.84.0` and `canonical-types >=0.45.0`, but still accept
`frontend-core`, `core-types` and `kit` from 0.81.0. `frontend-core` pins `orchestr` and `core-types` to its own
version: 0.84.0 pins both to 0.84.0. canonical-types 0.45.0 depends on `core-types` 0.84.0.

**Failure scenario.** A host on `frontend-core` 0.83 satisfies every declared peer once `orchestr` 0.84 is added.
The Nuxt module that runs is still `frontend-core`'s orchestr 0.83, which has no `isAvailable` (it is new in 0.84.0,
per its CHANGELOG). The actions are offered on shops without an integration and fail on every call.

**Fix.** Raise `core-types`, `frontend-core` and `kit` to `>=0.84.0` together with `orchestr`.

### L-7 · Low · CONFIRMED, informational — an update moves the review to the editing storefront's language and sales channel

`update-own-review.action.ts:19`, `README.md` Reviews table.

**What is wrong.** Shopware's save route writes `languageId` and `salesChannelId` from the current context on every
save (6.5 and 6.7), and fires `ReviewFormEvent`, so its flow mails go out again.

**Failure scenario.** A review written on the German storefront and edited on the English one becomes an English
review in Shopware's "filter-language" view, and the merchant receives the review-form mail again. Shopware's own
storefront edit behaves the same way.

**Fix.** Add a clause to the README row ("…keeps the variant; language and sales channel become the editing
storefront's"). No code change.

### L-8 · Low · SUSPECTED, pre-existing, widened here — a customer's unapproved review in a shared render now carries their name

`src/runtime/server/orchestr/product/reviews.link.ts:28`, `src/runtime/server/orchestr/review/base.resolver.ts:52-53`.

**What is wrong.** The Store API listing answers `status = true OR customerId = <session customer>`
(`ProductReviewRoute::load`), so a logged-in customer's listing includes their own unapproved review. The app reads
orchestr's `audience` nowhere (no match in `src/`), so a render made with the customer's cookie carries that review.
This change adds `ReviewReviewer`, the name the customer gave, to what is resolved for it. The text was already
there as `shortContent`.

**Failure scenario.** Only if such a render is stored in a shared cache: other visitors see an unapproved review
together with its author's name. Whether any cache layer stores renders made with cookies is not verified.

**Fix.** Not in this change: track the app's missing `audience` handling (drop the context token on a `shared`
render) as its own task.

### L-9 · Low · CONFIRMED, informational — get-own never says that reviews are switched off

`get-own-review.action.ts`.

**What is wrong.** The token allows `ReviewsDisabledError`. The Admin search ignores `core.listing.showReview`, so
get-own answers the review even where the sales channel has reviews off. The update then throws
`ReviewsDisabledError`. On such a shop the review listing link already fails with `PRODUCT__REVIEW_NOT_ACTIVE`, so
the section is broken there regardless.

**Fix.** None needed. Optionally, say in the README that only the update reports it.

### L-10 · Low · CONFIRMED — test gaps

`src/runtime/server/orchestr/review/own-review.action.test.ts`.

The suite is good where it looks: the exact filter, the sort, the limit, the variant in the path, the
name-and-email rule, and that no Admin call is made for a visitor. A sabotage on any of these fails a test. Missing:

- An Admin API refusal. It pairs with M-1 and has no test today.
- The `isAvailable` wiring. The mock `defineShopwareAction: (_token, handler) => handler` drops the third argument,
  so deleting `{ isAvailable: adminApiIsConfigured }` from either handler stays green. The mock could keep the
  options and the test check `isAvailable === adminApiIsConfigured`.
- The L-1 to L-3 guards, once they exist.

### Nits

- N-1, `defineShopware.ts:80-82`: `adminApiIsConfigured` sits between `defineShopwareAction` and
  `defineShopwareQuery` and splits the block of builder aliases. Move it below the block.
- N-2, `base.resolver.ts:53`: a review with no name could also set `isAnonymous: true`, which `ReviewReviewer`
  offers, so that a section need not read an empty string as "anonymous". Optional.

### Rule compliance (Change 1)

- Comments explain why, in the present tense, and none is a changelog: `update-own-review.action.ts:17,27`,
  `base.resolver.ts:52`, the JSDoc in `ownReview.ts`, the test's mock comment.
- No design-doc references and no customer names. Fixtures use `Kim` and `kim@example.com`.
- No manifest, token, zod-schema or component tests.
- The changesets address the consumer. `own-review.md` carries the version requirements that were taken out of
  `review-typed-errors.md`, which is right because all of them ship as one section.

## Change 2 — `SectionProductReviews` date band-aid

`packages/ui-app/src/runtime/app/section/SectionProductReviews.vue:143-144`, `.changeset/review-date-from-cache.md`.
As asked, the root cause in orchestr's JSON cache entry is not reported.

**The band-aid is correct.**

- `new Date(x)` copies a `Date` and parses the ISO string that `JSON.stringify` writes, so both the cache-hit path and
  the miss path give the same value.
- `toISOString()` is UTC, so the server and the client render the same text on either path, and hydration does not
  mismatch.
- The type checks: `new Date(Date)` is valid.
- It covers every consumer that needs it. The other `z.date()` entity fields (`ProductVariantAvailability.availabilityDate`,
  `ProductListItemBase.addedAt`, `BlogPostBase.publishedAt`) are not read anywhere in `packages/ui-app` or
  `packages/ui`, and this line is the only date call on an entity component there.
- The comment says why, in the present tense.
- The changeset is a `patch` for `@laioutr-app/ui`, which is the right package name. It reads for the consumer. The
  bug is on `main`, where line 143 is `createdAt.toISOString()`, so a separate patch entry is right.

### L-11 · Low · CONFIRMED, pre-existing, outside the band-aid — the date is shown as a raw ISO timestamp, and one bad date takes the section down

`SectionProductReviews.vue:144`, `packages/ui/src/runtime/components/ReviewItem/ReviewItem.vue:49`.

**What is wrong.** `ReviewItem` prints `date` verbatim (`{{ $tl('review.on') }} {{ date }}`). Its stories pass
`'09.09.2025'`; the section passes an ISO timestamp. Separately, a connector whose `createdAt` cannot be parsed yields
an Invalid Date. On a cache miss, `toISOString()` throws `RangeError` and the computed fails the whole section, not
one review, against the repo's fail-soft rule. After a cache round trip the same value becomes `null`, and then 1970.

**Failure scenario.** Every Shopware review shows "on 2026-11-12T10:00:00.000Z". One review with a broken date from
any connector blanks the review section.

**Fix.** In a separate change: format the date with the visitor's locale, and pass `undefined` for an invalid date.
`ReviewItem.date` is optional.

## Verdict

- **Change 1**: the security model is sound. The customer comes from the session, the browser picks only which of
  the customer's own reviews, and every write goes through the Store API, where Shopware checks ownership again.
  Nothing critical or high. **M-1 and M-2 should be fixed before release.** An upgraded shop with an
  under-privileged integration fails on every logged-in product page and nothing says why. Every own-review call
  costs the shop a bcrypt and a row write. L-1 to L-3 are small guards that belong in one shared helper (L-5). The
  rest is documentation or optional.
- **Change 2**: correct as a band-aid. It can ship. L-11 is pre-existing and belongs elsewhere.

## How the findings were handled (2026-11-12, by the author)

| Finding | Outcome |
| --- | --- |
| M-1 | Fixed. A refused Admin search (401, 403) throws an error that names the app, the integration and the role permission "Reviews: Read" (`product_review:read`, `product:read`), with the original as `cause`; any other failure is attributed too. README and manifest say "Reviews: Read". Unit test; checked live on Shopware 6.7 with an integration without permissions: 500 with that message, in the answer and in the log. |
| M-2 | Fixed in `shopwareAdminClientFactory`: the token is kept per process and integration (`sessionData`, `onAuthChange`) and fetched again when it expires. Three unit tests. |
| L-1, L-2, L-3, L-5 | Fixed in one helper, `findSessionCustomersReview`: a guest or a customer answer without a Shopware id is `UnauthenticatedError`; a product id that is not a Shopware id finds no review, without an Admin call. `hasViolation` moved beside `hasViolationAt`. |
| L-4 | Fixed: the update reads the review back after the save and answers what Shopware stored. |
| L-6 | Fixed: all core peers `>=0.84.0`. |
| L-7, L-9 | Fixed in the README. |
| L-10 | Fixed: tests for the Admin refusal, the guards, the read-back and the `isAvailable` wiring. |
| N-1 | Fixed. |
| N-2 | Not done: `isAnonymous` would say the reviewer chose to stay anonymous, which an empty name does not tell. |
| L-8, L-11 | Existed before this change; reported to the core owner, not fixed here. |

Each new behaviour was broken once on purpose and failed a test (10 sabotages). Smoke test after the fixes: 9/9 checks
on Shopware 6.5.6.1, 6.6.10.6 and 6.7.12.1.
