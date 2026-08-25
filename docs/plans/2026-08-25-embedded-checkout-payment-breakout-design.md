# Embedded checkout: payment break-out, flag split, route blocklist

Status: proposed
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

Submit the confirm form in the top-level window, for every order.

A click-driven form submit carries transient user activation, and the embed iframe sets no `sandbox`
attribute, so `allow-top-navigation-by-user-activation` applies. The frame can retarget its own form:

```js
// laioutr-embed.js, on the confirm page
var form = document.querySelector('#confirmOrderForm');
form.target = '_top';
```

Same-site, that is the entire change — the session already exists in the shared cookie jar when the
top-level POST lands, and `action` stays as Shopware generated it.

### Cross-site fallback

If the storefront cannot move to a subdomain, the top-level window is a different cookie jar with no
session, so the POST would land on a checkout with an empty cart. The session has to be installed
between the click and `/checkout/order`, which takes two hops:

```
[frame]     click Buy now → POST (target=_top) → https://<frontend>/app-shopware/checkout-order
[laioutr]   mint a handoff code from the server-held sw-context-token
            → 307 → https://<storefront>/laioutr/checkout-order?code=…
[storefront] redeem → setContextToken → regenerate session
            → 307 → /checkout/order
```

Both hops must be **307**. `frontend.checkout.finish.order` accepts POST only; 302 and 303 downgrade
the method to GET and the request 405s. 307 preserves method and body, so the original form body
reaches `/checkout/order` intact.

Minting between hops rather than up front avoids the handoff code's ~60s TTL expiring while the
shopper reads the terms, and avoids an async fetch inside the click handler outliving the activation
window.

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
Exact rather than predictive, and synchronous methods would never leave the frame. Rejected: it
still needs a top-level session for `/checkout/finish`, so it is no simpler cross-site, and it does
nothing for providers that fail for reasons other than a redirect — Apple Pay validates the merchant
against the top-level document's domain, and Payment Request flows need `allow="payment"` on the
iframe.

**Parent rebuilds the form from marshalled `FormData`** — rejected as unnecessary once the frame can
retarget its own form, and it would require transporting whatever the payment plugin injected into
the confirm form (SwagPayPal adds `paypalOrderId` and `isPayPalExpressCheckout` as hidden inputs)
across origins.

### Accepted costs

Synchronous methods — invoice, prepayment, cash on delivery — leave the frame for nothing. On a
same-site domain the shopper sees no domain change, so the cost is a full page load.

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

## 4. Open: the finish-page return trip

Not resolved here. The constraint: `CheckoutController::finishPage` redirects to
`frontend.checkout.register.page` when `$context->getCustomer() === null`, so reaching
`/checkout/finish` requires a session carrying a logged-in customer in whichever cookie jar the
browser is in at that moment. After §1 the browser is at top level on the storefront domain, not in
the frame.

`payment.finalize.transaction` itself is token-only — it decodes the `_sw_payment_token` JWT and
assembles the sales-channel context from the transaction id — so the provider's return hop needs no
session. Only the finish page does.

Candidates, to be decided separately: bounce top-level back into Laioutr via the existing
`/laioutr/cookie-bridge` and re-embed the finish page; or skip the Shopware finish page entirely and
send the shopper to a Laioutr confirmation page carrying the `orderId` the bridge already reports in
`laioutr:checkout-finish`.

## Ownership

| Change | Repo |
| --- | --- |
| Retarget `#confirmOrderForm` to `_top` | `shopware-laioutr-integration` (`laioutr-embed.js`) |
| `POST /laioutr/checkout-order` (cross-site fallback only) | `shopware-laioutr-integration` |
| `POST /app-shopware/checkout-order` (cross-site fallback only) | `@laioutr/app-shopware` |
| Split `embeddedModeEnabled` / `lockdownEnabled` | `shopware-laioutr-integration` |
| Invert `RouteAllowlist` to a blocklist | `shopware-laioutr-integration` |
| Storefront moves to a frontend subdomain | infrastructure |
