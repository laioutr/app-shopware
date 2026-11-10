---
'@laioutr/app-shopware': minor
---

Customers can finish a password reset, confirm a double opt-in registration, and change their password and email address.

Now implemented: `AuthResetPasswordAction`, `AuthConfirmEmailAction`, `CustomerChangePasswordAction` and `CustomerChangeEmailAction`. Reset and confirmation take the link the customer opened from Shopware's mail and read `hash` and `em` from it. An expired or unknown recovery link throws `PasswordResetTokenInvalidError` with its reason, an unknown confirmation link `EmailConfirmationTokenInvalidError`, a wrong current password `CurrentPasswordInvalidError`, and the password policy `InvalidFieldError` on `newPassword`. A confirmation signs the customer in and persists their context token; a password or email change keeps them signed in with whatever token Shopware answers with.
