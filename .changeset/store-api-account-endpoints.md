---
'@laioutr/app-shopware': minor
---

Customers can finish a password reset, confirm a double opt-in registration, change their password and email address, and delete their account; visitors can confirm and cancel a newsletter subscription, switch shipping and payment method, and empty the cart. Breadcrumbs show the whole category path.

- **Canonical actions** now implemented: `AuthResetPasswordAction`, `AuthConfirmEmailAction`, `CustomerChangePasswordAction` and `CustomerChangeEmailAction`. Reset and confirmation take the link the customer opened from Shopware's mail and read `hash` and `em` from it. An expired or unknown recovery link throws `PasswordResetTokenInvalidError` with its reason, an unknown confirmation link `EmailConfirmationTokenInvalidError`, a wrong current password `CurrentPasswordInvalidError`, and the password policy `InvalidFieldError` on `newPassword`. A confirmation signs the customer in and persists their context token; a password or email change keeps them signed in with whatever token Shopware answers with.
- **New app tokens**, exported from `@laioutr/app-shopware/tokens` and `@laioutr/app-shopware/runtime`:
  - `ShopwareAuthCheckResetLinkAction` tells a reset page whether its link is `valid`, `expired` or `invalid` before the customer types a password.
  - `ShopwareCustomerDeleteAction` deletes the account and clears the context token, as a logout does.
  - `ShopwareCustomerPaymentMethodSetDefaultAction` sets the customer's default payment method.
  - `ShopwareCustomerChangeLanguageAction` sets the language Shopware writes the customer's mails in, the request's language unless a `locale` is given.
  - `ShopwareCustomerGetNewsletterStatusAction` answers `subscribed`, `pending-confirmation`, `unsubscribed` or `not-subscribed`.
  - `ShopwareNewsletterConfirmAction` confirms a subscription from its double opt-in link; `ShopwareNewsletterUnsubscribeAction` unsubscribes an address and answers the same for one that is not subscribed.
  - `ShopwareContextGetAction` reads the session: signed in or not, currency, language, shipping country, the chosen shipping and payment method, and the methods available. `ShopwareContextUpdateAction` switches shipping method, payment method and shipping country, and persists the token of a visitor who had no session yet. Currency and language follow the market and are not switched here.
  - `ShopwareCartClearAction` empties the cart.
  - `ShopwareProductVariantByOptionsQuery` finds the `ProductVariant` for a selection named by axis and value, as `ProductOptionGroups` names them, without loading every variant.
- **Breadcrumbs** come from Shopware's own breadcrumb: `ProductBreadcrumbLink` now walks every category level from below the navigation root to the product, each linking by its SEO URL, where it showed the main category alone. `CategoryBreadcrumbLink` is new. On a Shopware release without the breadcrumb route the product falls back to its main category and a category's breadcrumb is empty, with a warning in the log.
