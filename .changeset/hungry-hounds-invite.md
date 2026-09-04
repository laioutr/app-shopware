---
'@laioutr/app-shopware': minor
---

The storefront can tell a signed-in shopper from an anonymous one, and send them somewhere to sign in.

`CustomerGetCurrentAction` answers the customer behind the request's Shopware context token — id, email, display name
and person details — and raises `UnauthenticatedError` when the context belongs to a guest, so a caller can branch on
session state without reading cookies of its own.

`AuthLoginOauthAction` answers the `account` arm of its result: a link to the Shopware instance's own login page, built
from the configured `storefrontUrl`. Shopware authenticates with credentials rather than an OAuth handshake, so there is
no handshake to run and no login UI to build on the Laioutr side — the product reviews section already navigates this
arm. `storefrontUrl` must be configured; without it the action throws.

`customer.addresses` comes back empty for now — each Shopware address needs its `countryId` resolved to the ISO country
code `MailingAddress` requires.
