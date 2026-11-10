---
'@laioutr/app-shopware': minor
---

Customers can finish a password reset, confirm a double opt-in registration, and change their password and email address. Breadcrumbs show the whole category path.

- **Canonical actions** now implemented: `AuthResetPasswordAction`, `AuthConfirmEmailAction`, `CustomerChangePasswordAction` and `CustomerChangeEmailAction`. Reset and confirmation take the link the customer opened from Shopware's mail and read `hash` and `em` from it. An expired or unknown recovery link throws `PasswordResetTokenInvalidError` with its reason, an unknown confirmation link `EmailConfirmationTokenInvalidError`, a wrong current password `CurrentPasswordInvalidError`, and the password policy `InvalidFieldError` on `newPassword`. A confirmation signs the customer in and persists their context token; a password or email change keeps them signed in with whatever token Shopware answers with.
- **Breadcrumbs** come from Shopware's own breadcrumb: `ProductBreadcrumbLink` now walks every category level from below the navigation root to the product, each linking by its SEO URL, where it showed the main category alone. `CategoryBreadcrumbLink` is new. On a Shopware release without the breadcrumb route the product falls back to its main category and a category's breadcrumb is empty, with a warning in the log.
