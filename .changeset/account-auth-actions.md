---
'@laioutr/app-shopware': minor
---

Customers can log out, register and recover their password through the canonical `AuthLogoutAction`, `AuthRegisterAction` and `AuthRecoverAction`.

- **Logout** ends the Shopware session and clears the context token, notifying `shopware:context-token:changed` with `null` as a logout inside the embedded checkout does. The old token is detached from the customer too, so the embedded checkout's storefront session, which holds the same token, is logged out as well.
- **Register** creates the customer with the given address as billing address, logs them in and answers `signed-in`, persisting the new context token. A sales channel with double opt-in registration leaves the customer logged out until they confirm the mail, and the action answers `pending-confirmation`. An address that already has an account throws `EmailAlreadyInUseError`. Shopware's other validation errors arrive as `InvalidFieldError` with the canonical field path (`['address', 'postalCode']`) and the violation as the reason — `MISSING`, `TOO_SHORT`, `INVALID_FORMAT`, or Shopware's own name for a shop-specific rule. A value longer than Shopware stores, which Shopware 6.5 does not validate, arrives as `TOO_LONG` on its field instead of as a server error.
- **Login** throws `InvalidCredentialsError` for a wrong address or password, and `CustomerNotConfirmedError` for a customer who has not confirmed that mail yet, on Shopware 6.5 as on later versions. Shopware 6.7.12 and later send the mail again.
- **Recover** sends Shopware's password-reset mail. It answers the same for an address without an account, so it cannot be used to probe for accounts.

**Breaking:** `AuthLoginAction` no longer answers a failed login with `success: false`. A wrong address or password throws `InvalidCredentialsError`, as the canonical action declares. Too many attempts fail the call with status 429, and any other failure, such as Shopware being unreachable, fails it too.

```ts
// before
const { success } = await fetchAction(AuthLoginAction, credentials);
if (!success) showWrongCredentials();

// after: the action's error reaches the browser as the cause of the thrown error
try {
  await fetchAction(AuthLoginAction, credentials);
} catch (error) {
  const name = (error as { cause?: { name?: string } }).cause?.name;
  if (name === '[SERVER] InvalidCredentialsError') showWrongCredentials();
  else throw error;
}
```

Register and recover need `storefrontUrl`, which Shopware builds the links in its mails from. Register passes `consents.privacyPolicy` on as Shopware's `acceptedDataProtection` and sends `true` when the form does not ask; a channel that requires the consent reports a refusal on `['consents', 'privacyPolicy']`.
