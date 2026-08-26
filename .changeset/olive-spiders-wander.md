---
'@laioutr/app-shopware': minor
---

Add a non-embedded checkout mode: send shoppers to the Shopware storefront at top level instead
of framing it.

Set `checkoutMode: 'redirect'` and the cart's checkout button navigates straight to the
storefront rather than to a Laioutr page hosting an iframe. The shopper gets a first-party
session on the shop's own domain, so redirect-based payment providers work with no break-out at
all, the storefront keeps its own header and footer, and `X-Frame-Options: deny` stays in place.
No Studio checkout page is needed — the **Shopware Checkout** section has no role in this mode.

Because the two sides no longer share a browsing context, a storefront login, registration or
guest checkout now bounces the browser through Laioutr and straight back to where the shopper
was. Both sides end up on the same Shopware session without leaving checkout, so the order
confirmation can actually read the order that was just placed.

Configure the shop for it in the Shopware admin: embedded mode off, the Laioutr domain listed
under Allowed callback domains, and the Order success page pointed at your confirmation page.
Requires a `LaioutrConnector` build carrying the auth bounce. `checkoutMode` defaults to
`embedded`, so existing projects are unaffected.
