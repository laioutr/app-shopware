---
'@laioutr/app-shopware': minor
---

Submit the embedded checkout's order from the top-level window, so redirect-based payment
providers work.

PayPal, Klarna and other providers that redirect out of checkout refuse to render inside an
iframe, and once framed they cannot navigate back out — the shopper reached a dead end with the
order already created. The confirm form now submits into the top-level window instead.

No configuration changes. The section keeps a single-use handoff code in the storefront frame
while the shopper is on the confirm page, so the top-level submit arrives with a session even
when the storefront sits on a different registrable domain than the frontend. Requires a
`LaioutrConnector` build that exposes the `/laioutr/checkout-order` route.
