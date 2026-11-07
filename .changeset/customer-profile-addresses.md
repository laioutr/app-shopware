---
'@laioutr/app-shopware': minor
---

Customers can manage their profile and address book through the canonical customer actions: `CustomerUpdateAction`, `AddressGetAllAction`, `CustomerAddressCreateAction`, `CustomerAddressUpdateAction`, `CustomerAddressDeleteAction` and `CustomerAddressSetDefaultAction`.

`CustomerGetCurrentAction` now fills `addresses`, `defaultBillingAddress`, `defaultShippingAddress` and `phone`, read with the customer in a single Store API call.

- An address's `countryCode` is the ISO 3166-1 alpha-2 code. `provinceCode` accepts Shopware's ISO 3166-2 state code (`DE-BY`) or its bare subdivision part (`BY`), and is read back as `DE-BY`.
- Shopware keeps phone numbers on addresses, so the customer's `phone` is the phone of the default billing address, and `CustomerUpdateAction` writes it there.
- Updates are partial: the stored profile or address fills in whatever the input leaves out.
- Errors use the canonical types: `UnauthenticatedError` for a guest, `AddressNotFoundError` for an address the customer does not have, and `InvalidFieldError` for a validation failure, with the canonical field path. A value longer than Shopware stores, which Shopware 6.5 does not validate, arrives as `TOO_LONG` on its field instead of as a server error. Shopware's refusal to delete a default address has no canonical counterpart and arrives unchanged.
