---
'@laioutr/app-shopware': minor
---

Customers can log out, register and recover their password through the canonical `AuthLogoutAction`, `AuthRegisterAction` and `AuthRecoverAction`.

- **Logout** ends the Shopware session and clears the context token, notifying `shopware:context-token:changed` with `null` as a logout inside the embedded checkout does.
- **Register** creates the customer with the given address as billing address and logs them in, persisting the new context token. Shopware's validation errors arrive as `InvalidFieldError` with the canonical field path (`['address', 'postalCode']`) and the violation as the reason — `MISSING`, `TOO_SHORT`, `INVALID_FORMAT`, or Shopware's own name such as `CUSTOMER_EMAIL_NOT_UNIQUE`. A sales channel with double opt-in registration creates the customer inactive and leaves them logged out until they confirm.
- **Recover** sends Shopware's password-reset mail. It answers the same for an address without an account, so it cannot be used to probe for accounts.

Register and recover need `storefrontUrl`, which Shopware builds the links in its mails from. Register sends `acceptedDataProtection: true`, since the canonical input has no consent field: collect consent in the registration form.
