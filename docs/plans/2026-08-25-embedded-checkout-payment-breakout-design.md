# Embedded checkout: payment break-out, flag split, route blocklist

Status: §1–§3 implemented, §4 specified
Repos: `@laioutr/app-shopware`, `shopware-laioutr-integration`

## Context

The embedded checkout renders the Shopware storefront in an iframe on the Laioutr origin. Three
defects surfaced while debugging PayPal on `scheunentor.karls.de` (frontend) against
`karls-wildcard.datrycs.io` (storefront). They are independent changes but they interlock, so they
are described together.

All findings below were traced against Shopware 6.7.12.1 and SwagPayPal 10.7.0.

### Prerequisite: the storefront must share the frontend's registrable domain

`karls.de` and `datrycs.io` are different eTLD+1, so the iframe is a **cross-site** context. Every
storefront cookie is third-party: `SameSite=Lax` cookies are dropped outright, `SameSite=None` ones
are partitioned into a separate jar by Firefox and blocked entirely by Safari.

Moving the storefront to a subdomain of the frontend — `checkout.karls.de` — makes the frame
same-site. Frame and top-level window then share one cookie jar and one session.

This is not a nice-to-have alongside the three changes below. It is what makes the first one a
two-line change instead of two new routes, and it is the only arrangement in which embedded
checkout works in Safari at all. Sequence it first.

## 1. Break the order submit out to the top-level window

### Problem

Clicking "Buy now" is a native form POST — `#confirmOrderForm`, action `frontend.checkout.finish.order`
(`confirm/index.html.twig:319-345`). `FormHandlerPlugin` only adds client-side validation and a
loading indicator; it does not intercept the submit.

`CheckoutController::order()` creates the order, then calls `PaymentProcessor::pay()`, which resolves
the payment handler and calls `AbstractPaymentHandler::pay()`. That method's return value is the
branch point:

| `pay()` returns | Outcome |
| --- | --- |
| `null` | Synchronous. Controller redirects to `/checkout/finish`. Never leaves the frame. |
| `RedirectResponse` | Asynchronous. Browser navigates to the provider, returns to `/payment/finalize-transaction`, then `/checkout/finish`. |

In the asynchronous case the provider loads *inside the iframe*. Providers that refuse to be framed
then try to navigate the top-level window, and the browser blocks it: the provider's frame is
cross-origin to the top window and, several redirects after the click, has no transient user
activation left. That is the observed PayPal failure — a dead end with the order already created.

There is no render-time signal to distinguish the two cases. Shopware 6.5/6.6 had separate
`SynchronousPaymentHandlerInterface` and `AsynchronousPaymentHandlerInterface`; 6.7 unified them into
`AbstractPaymentHandler`, whose `supports()` declares only `PaymentHandlerType::RECURRING` and
`::REFUND`. Whether a redirect happens is decided inside `pay()`, at runtime, after the order exists.

### Decision

Submit the confirm form in the top-level window, for every order — in embedded mode. Un-embedded
there is no frame to escape and the form is left alone; see §4's **Scope by mode**.

A click-driven form submit carries transient user activation, and the embed iframe sets no `sandbox`
attribute, so `allow-top-navigation-by-user-activation` applies. The frame can retarget its own form:

```js
// laioutr-embed.js, on the confirm page
var form = document.querySelector('#confirmOrderForm');
form.target = '_top';
```

Same-site, that is the entire change — the session already exists in the shared cookie jar when the
top-level POST lands, and `action` stays as Shopware generated it.

### Cross-site: the code travels in the form

If the storefront cannot move to a subdomain, the top-level window is a different cookie jar with no
session, so the POST would land on a checkout with an empty cart. A handoff code installs one:

```
[parent]     mints on a cadence at POST /app-shopware/order-handoff (same-origin, cookie sent)
             → posts laioutr:order-handoff { code } to the frame
[frame]      keeps a hidden `code` input on #confirmOrderForm, action → <storefront>/laioutr/checkout-order
[frame]      click Buy now → POST (target=_top), same-site with the storefront
[storefront] redeem → setContextToken → regenerate session → 307 → /checkout/order
```

The redirect must be **307**. `frontend.checkout.finish.order` accepts POST only; 302 and 303
downgrade the method to GET and the request 405s. 307 preserves method and body, so the confirm
form's fields reach `/checkout/order` intact.

The parent mints, not the frame, because the mint needs the `sw-context-token` cookie and that cookie
is `SameSite=Lax`. Only a same-origin request carries it — a cross-site POST navigation to Laioutr
would arrive without it, which rules out routing the submit through Laioutr first. Minting on a
cadence rather than at submit time keeps a code inside its ~60s lifetime without an async fetch
inside the click handler outliving the activation window.

### Notes on the mechanism

**Retarget in JS, not Twig.** The form's `action` comes from `confirmOrderFormAction`, set at
`confirm/index.html.twig:229` outside any block. Changing it through template inheritance means
copying the whole ~120-line `page_checkout_aside_actions` block and owning its upgrade risk.

**The new storefront route is storefront-scoped, not store-api.** Store-API routes are
`_routeScope: ['store-api']` — stateless, no PHP session, context resolved from the
`sw-context-token` header. They cannot install a storefront session. A cross-origin form POST also
cannot send `sw-access-key`, since forms cannot set headers. The route belongs next to
`/laioutr/connect-session` in `ConnectController`.

### Alternatives considered

**Break out only when a handler returns an external redirect** — a `KernelEvents::RESPONSE`
subscriber replacing such responses with a page that posts a redirect instruction to the parent.
Exact rather than predictive: synchronous methods, SPB included, would finish inside the frame and
never cross the cookie-jar boundary, so §4 would fire only for genuine redirects.

Deferred, not rejected on merit. It needs a second mechanism for providers that fail without ever
returning a redirect — Apple Pay validates the merchant against the top-level document's domain, and
Payment Request flows need `allow="payment"` on the iframe — which means a per-payment-method
override on top. Breaking out unconditionally covers those cases for free. Should the deferred
decision above be revisited, the subscriber and that override come as a pair.

**Parent rebuilds the form from marshalled `FormData`** — rejected as unnecessary once the frame can
retarget its own form, and it would require transporting whatever the payment plugin injected into
the confirm form (SwagPayPal adds `paypalOrderId` and `isPayPalExpressCheckout` as hidden inputs)
across origins.

### Accepted costs

Synchronous methods leave the frame for nothing. On a same-site domain the shopper sees no domain
change, so the cost is a full page load.

The cost is larger than it first looks, and is accepted knowingly. It was originally priced as
"invoice, prepayment, cash on delivery" — rare and low-stakes. That was wrong: PayPal's Smart
Payment Buttons happy path is synchronous too. `AbstractPaymentMethodHandler::pay()` finds no
`approve` or `payer-action` link on an already-approved order, captures, and returns `null`. So the
cost lands on the most common redirect-provider path, and on behaviour that works today.

**Decision: break out for every order anyway, for now.** Breaking out unconditionally is the only
approach with no runtime guessing and no per-method configuration, and it is what §1 already ships.
Making the cost small is §4's job: once the return trip lands, leaving the frame costs a page load
and the shopper comes back on their own.

Revisit if that page load turns out to be visible enough to matter — the response-subscriber
alternative below is the fallback, and its rejection is now a deliberate deferral rather than the
reasoning originally given for it, which the SPB finding undercut.

## 2. Split `embeddedModeEnabled` into two flags

### Problem

One setting drives three unrelated behaviours:

1. Removing `X-Frame-Options` and loading `laioutr-embed.js` — required for the integration to work.
2. Hiding header, navigation, footer and cookie bar — cosmetic.
3. `LockdownSubscriber`'s route restriction — a policy choice.

Only the first is essential. The third is what breaks payment plugins (§3). Because they share a
flag, turning lockdown off to diagnose a payment problem also un-frames the shop and restores the
header, which is why the interaction went unnoticed.

### Decision

Split into `embeddedModeEnabled` (framing, bridge, chrome) and `lockdownEnabled` (route
restriction). Both default on. `lockdownEnabled` has no effect when `embeddedModeEnabled` is off.

This is worth landing first regardless of §3: it gives an immediate per-sales-channel escape hatch
for any plugin the allowlist blocks.

## 3. Invert the route allowlist to a blocklist

### Problem

`RouteAllowlist` permits five route-name prefixes (`frontend.checkout.`, `frontend.account.`,
`frontend.cart.`, `frontend.laioutr.`, `widgets.`), one path prefix (`/widgets/`) and four exact
route names. Everything else is redirected to the cart by `LockdownSubscriber`.

Every payment plugin registers its own `frontend.*` namespace, and none of them match. SwagPayPal
alone needs eight:

```
frontend.paypal.create_order              POST /paypal/create-order
frontend.paypal.restore_context           GET  /paypal/restore-context/{token}
frontend.paypal.vault.clear
frontend.paypal.pui.payment_instructions
frontend.paypal.express.create_order
frontend.paypal.express.prepare_cart
frontend.paypal.express.prepare_checkout
frontend.paypal.express.shipping_callback
```

All are `_routeScope: ['storefront']`, so all are blocked. `/paypal/create-order` is the order-creation
call behind Smart Payment Buttons, which SwagPayPal enables by default — so SPB cannot complete, and
the flow degrades to the classic redirect that then fails inside the frame per §1.

The failure is silent: a 302 to the cart, no error surfaced anywhere. Amazon Pay, Klarna, Mollie,
Adyen and Unzer each register their own namespaces and will each rediscover this independently.

### Decision

Block the content routes Laioutr owns; allow everything else. That set is small, stable and entirely
in Shopware core:

```
frontend.home.page
frontend.navigation.page
frontend.detail.page
frontend.search.page
frontend.search.suggest
frontend.cms.page
frontend.cms.navigation.page
frontend.landing.page
frontend.sitemap.page
frontend.sitemap.xml
```

The `lockdownAdditionalAllowedRoutes` setting inverts to additional *blocked* routes, keeping the
per-channel escape hatch.

This flips the failure mode from "every third-party payment plugin is silently broken" to "an
obscure storefront page occasionally reachable" — cosmetic, and tightenable as instances are found.
Given that a broken checkout is the worst outcome this integration can produce, that is the correct
direction.

### Note

`payment.finalize.transaction` (`/payment/finalize-transaction`) is declared on `AbstractController`
with no route scope, deliberately, so it works headless. `LockdownSubscriber` returns early when the
storefront scope is absent, so the provider's return leg is unaffected by either version of the list.

## 4. Getting back into the frame

### Problem

After §1 the whole payment leg runs in the top-level window on the storefront domain. Every way out
of `/checkout/order` therefore ends outside the frame, and there are two the shopper actually
reaches.

**The order completed.** `CheckoutController::finishPage` redirects to
`frontend.checkout.register.page` when `$context->getCustomer() === null`, so `/checkout/finish`
needs a session carrying a logged-in customer in whichever cookie jar the browser is in.
`payment.finalize.transaction` does not — it decodes the `_sw_payment_token` JWT and assembles the
sales-channel context from the transaction id — so the provider's return hop is fine. Only the finish
page is a problem.

§1 also breaks the mechanism that already exists for this. The checkout section navigates to an
editor-configured "Order Confirmation Page" with `?order=<orderId>` when it receives
`laioutr:checkout-finish`, which the bridge emits after finding `[data-laioutr-order-id]` on the
finish page. Top level, `window.parent === window`, so that message reaches nobody. The destination
is built; only the transport is wrong.

**The payment failed or was cancelled.** `CheckoutController::order()` sets the payment token's
`errorUrl` to `frontend.account.edit-order.page`, so a decline, a failed 3-D Secure step-up or a
cancellation at the provider all land there — top level, on the storefront domain, chrome hidden.
Before §1 that happened inside the frame and looked like part of the site.

These need opposite treatment. The finish page is *replaced*, because Laioutr renders the
confirmation itself. Edit-order is *re-framed*, because only Shopware can still take payment for an
order whose cart is gone.

### Scope by mode

Almost all of this exists because there is a frame to get back into. With embedded mode off — a
project that renders content in Laioutr but sends shoppers to the storefront's own checkout on its
own domain — there is no frame at any point, and only one thing is worth doing:

| | Embedded mode on | Embedded mode off |
| --- | --- | --- |
| Order completed | replace the finish page with the Laioutr confirmation page | redirect to the Laioutr order-success page |
| Payment failed or cancelled | bounce back and re-frame `edit-order` | leave it; the storefront handles the retry in full |
| Confirm form retargeted | yes (§1) | no |
| Route parameters in the handoff | needed | not needed |

Un-framed, `edit-order` is simply a storefront page with its header and footer, and retrying payment
there is the complete and correct experience. There is nothing to improve and nothing to carry back,
so the retry machinery below applies only to embedded mode.

The success redirect applies to both. In the un-embedded topology it is also the *only* mechanism,
and its URL can only come from the plugin config: the shopper reaches the storefront through
`/app-shopware/checkout`, a server route with no view of the section's configured pages, because
there is no embedded section in that topology at all. That makes the fallback field primary rather
than a safety net — which is a second, independent reason to have it.

### Why the failure path cannot go to the Laioutr checkout

`CartOrderRoute` deletes the cart once the order exists. Returning the shopper to the checkout page
would show them an empty cart while an unpaid order sits in their account. `edit-order` is the only
surface that can still pay it: it permits guests and carries `change-payment-method`. So the
destination is right and only its framing is wrong.

### Decision

In embedded mode both exits bounce the top-level window back to Laioutr, which re-enters the frame
where appropriate. Everything the bounce needs travels in the handoff or the URL, so neither leg
depends on a session surviving the provider.

```
[section]     mint carries the confirmation-page URL and the checkout-page URL
[laioutr]     POST /app-shopware/order-handoff → store-api mint
[storefront]  POST /laioutr/checkout-order redeems it → both callbacks stored in the session
              …shopper pays…

  completed   GET /checkout/finish     → 302 <confirmation>?order=<id>
  failed      GET /account/order/edit  → 302 <checkout>?retry-order=<id>&error-code=<code>
                                         → section mints with retry-order
                                         → connect-session → edit-order, in the frame
```

Un-embedded, the same subscriber does far less:

```
  completed   GET /checkout/finish     → 302 <configured success URL>?order=<id>
  failed      GET /account/order/edit  → rendered as-is
```

**Never leave the frame without a way back.** A break-out that could only end on a Shopware page is
worse than no break-out. Two things guarantee a return exists: the plugin carries per-sales-channel
fallback URLs, and when neither those nor the section's configured pages are available the frame is
told so and never retargets the form, leaving checkout in the frame exactly as it behaved before §1.

The fallbacks are the durable half. They live in `system_config` rather than the session, so they
survive the one failure the session cannot — see **Session requirement**. Both are validated against
the allowed callback domains like every other callback. A handoff callback wins when present; a
fallback only fills in.

The stored callbacks are the state, rather than one-shot markers: refreshing or navigating back
redirects again instead of falling through to a Shopware page. Every handoff redemption writes both
values — `connect-session` writing `null`, since its handoffs carry none — so they always describe
the checkout in progress and cannot leak into a later one.

The section already resolves the confirmation page for `onCheckoutFinish` and knows its own URL; it
passes both, made absolute, when it asks for a code. Laioutr keeps ownership of which pages those
are, so an editor can change them without touching Shopware.

### The retry path needs route parameters

`connect-session` generates its target with `$this->urlGenerator->generate($handoff->redirectRoute)`
and no parameters, which is enough for the confirm page but not for
`frontend.account.edit-order.page`, which is keyed by `{orderId}`.

So the handoff carries route parameters alongside the route name, and the section passes
`retry-order` through when it mints. The order id travels in the URL rather than the storefront
session deliberately: a session written at top level on the storefront domain lives in a different
jar from the one the re-entered frame reads, so anything stored there is invisible by the time it is
needed.

The error code travels with it. Without it the frame silently jumps to a payment-selection screen
with no explanation; with it Laioutr can say "Payment cancelled — choose another method". The codes
are Shopware's own (`CHECKOUT__CUSTOMER_CANCELED_EXTERNAL_PAYMENT` and siblings) and are already in
the redirect the shopper receives.

One detection and one bounce cover declines, failed step-ups and cancellations alike, because
Shopware routes all of them through the same `errorUrl`.

### Hook at RESPONSE, not REQUEST

Lockdown short-circuits at `KernelEvents::REQUEST` because the decision needs only the route name.
These cannot: `finishPage` redirects to edit-order when the payment failed, and that outcome is only
known after the page loads.

Reaching the finish route at all already implies the payment succeeded, since `finalizeTransaction`
sends failures to the token's `errorUrl`. So the subscriber runs on `KernelEvents::RESPONSE` and
discriminates by what each route produced:

| Route | Response | Meaning | Action |
| --- | --- | --- | --- |
| finish | `200` | paid, session intact | → confirmation callback |
| finish | `302` → register | paid, session lost | → confirmation callback |
| finish | `302` → edit-order | payment failed | → checkout callback, with `retry-order` |
| finish | `302` → cart | `OrderException` | leave alone |
| edit-order | any | payment failed or cancelled | → checkout callback, with `retry-order` |

The last row applies in embedded mode only. Un-embedded, the finish rows still apply and edit-order
is left alone.

The register case is why the fallback exists, and it is worth rescuing rather than merely tidying:
the shopper's Laioutr session is untouched, because the `sw-context-token` cookie is first-party on
the Laioutr domain and never travelled to the provider. Bouncing them back lands them somewhere that
can still render their order. The `orderId` is read from the query string, so it survives a session
that did not; the redirect is skipped when it is absent.

Edit-order is bounced only when a checkout callback is stored, so a shopper who reaches it by
navigating their account normally is left alone.

Both fire only on the main request. `order()` forwards to the finish route as a sub-request when a
stored order's payment is invalid, and that path always carries `paymentFailed`, so restricting to
the main request excludes it without a second check.

### Storage

`laioutr_session_handoff` gains `finish_success_callback`, `checkout_callback` and
`redirect_route_params` columns; `SessionStorage` gains the matching accessors. Only the first is
exercised in the un-embedded topology, where the value comes from the plugin config instead.

### Server-side validation failures stay put

A cart-hash mismatch or an out-of-stock item re-renders the confirm page top level. Unlike the two
paths above, nothing was paid and no order exists, so there is no identifier to carry back and
nothing for Laioutr to show. What those pages need instead is to look presentable un-framed, which is
now a separate and cheap question: chrome hiding is its own per-channel flag (§2), so a channel can
keep its header for exactly these pages.

### Session requirement

`framework.session.cookie_samesite: none` with `cookie_secure: true` is a requirement of this design,
not a suggestion. A provider that returns by POST — 3-D Secure step-ups commonly do — makes a
cross-site POST navigation, and `SameSite=Lax` cookies are withheld on those. Finalize still succeeds
because it is token-only, but the browser arrives with a fresh session carrying neither callback nor
a customer. `Strict` breaks the return outright. This holds even once the storefront moves to a
frontend subdomain, because the provider is cross-site either way.

The fallback URLs are what keep that survivable: read from config rather than the session, so a
shopper whose session did not survive the provider still reaches Laioutr instead of a register form.
Configure the session correctly regardless — the fallbacks are a safety net, not a substitute.

### Accepted cost

Payment methods that render instructions on the finish page — PayPal Pay upon Invoice, prepayment,
bank transfer — lose them, because the shopper never sees that page. Reproducing them from the order
on the Laioutr side is follow-up work. Until then the only lever is per project rather than per
payment method: leaving the confirmation page unconfigured keeps checkout in the frame entirely, at
the cost of the break-out that redirect-based providers need.

### Alternatives considered

**Deriving the Laioutr origin** from the login or logout callback already in the session and
appending a fixed app-owned path avoids the new columns and the mint change. Rejected: it couples the
two codebases on a literal path string, and the pages are editor-configured, so Laioutr would still
have to resolve them after the redirect — trading a migration for an extra hop and a hidden contract.

**Carrying the retry target in the storefront session** instead of the URL needs no schema change:
the connector would record "edit-order for order X" and `connect-session` would honour it on the next
redemption. Rejected because it only works same-site. The session is written at top level on the
storefront domain and read from a frame under the Laioutr domain, which is a different cookie jar
whenever the two differ — precisely the case the handoff exists for.

## Ownership

| Change | Repo | Status |
| --- | --- | --- |
| Retarget `#confirmOrderForm` to `_top` | connector (`laioutr-embed.js`) | done |
| `POST /laioutr/checkout-order` | connector | done |
| `POST /app-shopware/order-handoff` + handoff refresher | `@laioutr/app-shopware` | done |
| Split `embeddedModeEnabled` / `lockdownEnabled` | connector | done |
| Invert `RouteAllowlist` to a blocklist | connector | done |
| Gate the `X-Frame-Options` removal on embedded mode | connector | done |
| Handoff columns: finish callback, checkout callback, route params | connector | §4 (embedded) |
| Fallback success and checkout URLs in the plugin config | connector | §4 |
| RESPONSE subscriber: finish route both modes, edit-order embedded only | connector | §4 |
| Pass both page URLs when minting; handle `?retry-order=` in the section | `@laioutr/app-shopware` | §4 (embedded) |
| Storefront moves to a frontend subdomain | infrastructure | open |
