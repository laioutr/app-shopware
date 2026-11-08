# Redirect checkout mode — design

**Status:** approved, not yet implemented
**Spans:** `@laioutr/app-shopware` and the `LaioutrConnector` Shopware plugin
(`shopware-laioutr-integration`)

## Goal

Let a project send shoppers to the Shopware storefront's own checkout by top-level redirect
instead of embedding it in an iframe, including when Laioutr and the storefront sit on
unrelated registrable domains (`bar.com` and `checkout.foo.com`).

Embedded mode stays the default and is unchanged. The two modes coexist.

## Why

Embedded mode exists to work around redirect-based payment providers refusing to render in a
frame, and it pays for that with a top-level break-out, a handoff-code refresher, a postMessage
bridge and a return trip. Redirect mode deletes that whole class of problem: the shopper is
genuinely top-level on the storefront with a first-party session, so Shopware's own confirm
form works untouched and no provider ever sees a frame.

It costs one thing instead: Laioutr and the storefront no longer share a browsing context, so
an auth change on the storefront has to be actively synced back.

## What already works

Turning `embeddedModeEnabled` off already gives most of redirect mode, because the plugin's
storefront-presentation concerns are all gated on that flag:

- `base.html.twig`, `header-minimal`, `footer-minimal` restore the storefront's own chrome.
- `removeFrameOptionsHeader` stands down, so `X-Frame-Options: deny` is preserved.
- The confirm form is not retargeted, so the order submit is an ordinary same-origin POST.
- `CheckoutReturnDecision` already returns the finish URL un-embedded and already declines to
  redirect a failed payment, leaving the retry on the storefront where it belongs.
- `ReturnTargetResolver` already falls back to `finishFallbackUrl` when a mint carries no
  session-level target, so the success return needs no new configuration.
- Lockdown is already independent of embedded mode.

The gaps are the entry point, and the auth sync.

## Scope

**In:** mode selection, the cart's checkout link, the callback targets a mint installs, and a
round-trip session sync on storefront login/logout.

**Out:**

- Lockdown behaviour. Blocked routes keep redirecting to the Shopware cart in both modes. The
  storefront is a self-contained checkout island in redirect mode; a shopper who wants out uses
  the back button. Revisit only if that proves confusing in practice.
- A per-market finish URL. `finishFallbackUrl` is per-sales-channel, which covers the common
  case. A Laioutr project serving several markets from one sales channel would need the URL
  resolved per request instead — `finishSuccessCallback` is already an optional mint parameter,
  so that can be added later without breaking anything.
- Any change to the embedded path.

## Design

### 1. Mode selection

One new module option in `app-shopware`:

```ts
checkoutMode?: 'embedded' | 'redirect'   // default 'embedded'
```

Defaulting to `embedded` leaves existing projects untouched. It is exposed in public runtime
config alongside `storefrontOrigin`, because the section reads it.

On the Shopware side redirect mode is simply `embeddedModeEnabled = false`. No new flag.

**The two settings must agree, and nothing enforces it.** A mismatch produces a chrome-less
storefront loading a bridge with no parent frame. This is documented in both READMEs rather
than checked at runtime, because the check would cost a request on every checkout.

### 2. Going out

`server/orchestr/cart/base.resolver.ts` branches on the mode:

| mode | `checkoutLink` |
| --- | --- |
| `embedded` | `{ type: 'pageType', pageType: Checkout }` — unchanged |
| `redirect` | `{ type: 'url', href: '<origin>/app-shopware/checkout' }` |

`LinkUrl` already exists in `@laioutr-core/core-types`, so no new link machinery. Both branches
stay gated on `storefrontUrl`. In redirect mode the merchant needs no Studio Checkout page at all.

**That redirect href must be absolute.** The handoff route is a Nitro server route, not a page,
and frontend-core registers a catch-all that matches every path — so a relative href rendered
through `NuxtLink` is claimed by vue-router, and the shopper gets a client-side 404 without the
server ever seeing the request. An absolute URL is how the link says it leaves the Vue app. The
origin comes from the request, exposed on the Orchestr context by `defineShopware.extendRequest`,
so each market builds its own.

`resolveCheckout` keeps `redirectRoute: CHECKOUT_REDIRECT_ROUTE`, which is the confirm page.
Laioutr renders the cart in both modes, so the shopper arrives ready to confirm. In redirect
mode it sends:

- no `checkoutCallback` — there is no Laioutr checkout page for a retry to return to, and
  `CheckoutReturnDecision` already leaves the retry on the storefront un-embedded;
- no `finishSuccessCallback` — `installSession` clears the session value, so
  `ReturnTargetResolver` falls through to `finishFallbackUrl`;
- `loginSuccessCallback` and `logoutSuccessCallback` pointing at
  `ADOPT_SESSION_ENDPOINT_PATH` on the request origin rather than the origin itself (see the
  session sync below), still overridable by the existing `checkoutLoginCallbackUrl` /
  `checkoutLogoutCallbackUrl` options for SSO projects.

`SectionShopwareCheckout` has no role in redirect mode. It emits a dev-only warning if an
editor places it on a page anyway.

### 3. Coming back — the session sync

Shopware rotates the context token when a shopper logs in, registers, or checks out as a guest.
In redirect mode that happens on the storefront, in a cookie jar Laioutr cannot see, so Laioutr
would come back holding a stale guest token: shown as logged out, and unable to read the order
it was just handed the id of.

The sync therefore has to happen **at the moment the session changes**, not deferred to the
return trip — otherwise Laioutr is stale for the whole of checkout, which is wrong if the
shopper abandons, opens another tab, or the payment fails.

It cannot be a one-way redirect to Laioutr: an auth change during checkout would eject the
shopper from their purchase. It also cannot be a background request, because a cross-site
fetch cannot write Laioutr's cookie.

So it is a **round trip**. `CookieRedirectController` is already this pattern in the other
direction.

```
shopper registers at the checkout step on checkout.foo.com
  → Shopware rotates A → B, would redirect to /checkout/confirm
  → CallbackRedirector 302s instead to
      bar.com/app-shopware/adopt-session
        ?from=<route>&code=<handoff for B>&return-to=https://checkout.foo.com/checkout/confirm
  → Laioutr redeems B server-side and writes its httpOnly cookie   ← first-party write
  → 302 back to return-to
  → shopper lands at /checkout/confirm, logged in, both sides on B
```

The middle hop is a top-level navigation to `bar.com`, which is why Laioutr's cookie write is
first-party and the flow survives third-party-cookie blocking.

#### Connector changes

`CallbackRedirector` gains the mint that `AuthBridgeNotifier::scheduleLogin` already performs —
a single-use handoff code for the rotated token — and appends it as `code` alongside the
existing `from`. The Shopware context token itself still never enters a URL.

It also gains `return-to`. The value is not known when the callback is scheduled, so scheduling
records only whether to carry one; `applyScheduledCallback` already runs at `RESPONSE` with
Shopware's own `RedirectResponse` in hand and takes the target from there, made absolute against
the request. The destination is passed through opaquely and never interpreted.

When the scheduled response is not a `RedirectResponse` there is no destination to carry, so
`return-to` is omitted and Laioutr keeps the shopper. That is the safe direction: a login that
rendered a page rather than redirecting is not a checkout step.

The changed signatures, which the two subscribers call:

```php
scheduleLoginCallback(Request $request, string $contextToken, string $salesChannelId, string $from, bool $carryReturn): void
scheduleLogoutCallback(Request $request, string $from, bool $carryReturn): void
buildRedirectUrl(string $callbackUrl, string $from, ?string $code, ?string $returnTo): string
```

The two callers split on intent:

| caller | intent | `return-to` |
| --- | --- | --- |
| `AuthSubscriber` — the auth state changed | sync, then send back | Shopware's own destination |
| `RouteSubscriber` — a Laioutr-owned page | sync, then keep | omitted |

`RouteSubscriber` needs the context token and sales channel id for the mint; both are on the
`SalesChannelContext` it already holds.

Logout appends no `code`. Code present means adopt, code absent means clear — the rule the
embedded bridge already uses.

#### App changes

A GET handler on the existing `/app-shopware/adopt-session` path. Same job as today's POST,
different transport: redeem the code, set or clear the httpOnly cookie, then 302 to `return-to`
or to `/`.

The redirect decision is a pure, injected-dependency function beside the existing
`resolveAdoptSession`, so the whole outcome matrix is unit-testable without an h3 event.

### 4. What deliberately does not change

- The finish return carries only `?order=`, exactly as today. The session is already in sync by
  the time the order completes, so it needs no code.
- No checkout-route detection anywhere. An earlier draft needed a predicate to suppress the auth
  bounce during checkout; carrying `return-to` removes the need to know what a checkout route is.
- `CheckoutReturnDecision`, `RouteBlocklist`, `LockdownSubscriber`, and the whole embedded
  break-out are untouched.

## Security

**`return-to` is an open-redirect vector.** It is validated against the configured
`storefrontUrl` origin — exact origin match, anything else falls back to `/`. A pure function
with its own tests. No signing is required: the origin allowlist closes the hole regardless of
who crafted the URL, and a crafted URL still needs a valid single-use code to have any other
effect.

The callback URL the storefront redirects to is already domain-validated by
`DomainWhitelistValidator`, so `bar.com` must be listed in **Allowed callback domains**. That
is the only cross-domain configuration redirect mode needs — the context token crosses inside
the handoff code, server to server, and never as a cookie.

The single-use code arrives in a URL and must not survive in one. The adopt route consumes it
and redirects without it; leaving it in the address bar is what produced the replayed-code 500
in embedded mode.

`X-Frame-Options: deny` is preserved in redirect mode, because `removeFrameOptionsHeader` stays
gated on `embeddedModeEnabled`. Redirect mode is the stricter posture of the two.

## Testing

**Connector, unit:** the mint-and-append in `CallbackRedirector`; `return-to` present for an
auth change and absent for the account-page bounce; a non-redirect response handled without
error.

**Connector, integration:** a checkout login produces a bounce whose `return-to` is the confirm
page; a logout bounce carries no code.

**App, unit:** the `return-to` origin validator; the adopt-and-redirect decision matrix;
`resolveCheckout`'s callback targets per mode; the cart resolver's link branch. No Vue component
tests, per the repo rule.

**Manual, and the only thing that actually proves it:** a full cross-site run on real staging
domains. `localhost:3000` and `localhost:8000` differ only by port and are same-site, so they do
not exercise the cookie behaviour this design exists to survive.

## Risks

- **Two extra 302s per auth change.** Standard SSO-bounce territory, roughly 100–200ms, and it
  fires only on login and logout rather than per page.
- **A dropped bounce leaves Laioutr stale** until the next auth change. The finish return does
  not carry a recovery code, on the grounds that the failure mode is a visible logged-out state
  rather than a lost order. Revisit if it happens in practice.
- **The two mode settings can disagree**, as above.
- **Guest checkout is assumed to fire `CustomerLoginEvent`.** Shopware logs guests in with
  `guest = true`, so it should, but the token-rotation path for a pure guest order needs
  confirming against a running shop during implementation rather than assumed.

## Configuration reference

| Where | Setting | Redirect mode |
| --- | --- | --- |
| `nuxt.config.ts` | `checkoutMode` | `'redirect'` |
| `nuxt.config.ts` | `storefrontUrl` | required, as today |
| Shopware admin | Embedded mode | **off** |
| Shopware admin | Lockdown | on |
| Shopware admin | Allowed callback domains | must include the Laioutr domain |
| Shopware admin | Order success page | the Laioutr confirmation page URL |
| Shopware admin | Checkout page (payment retry) | unused in redirect mode |
