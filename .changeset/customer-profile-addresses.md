---
'@laioutr/app-shopware': minor
---

Customers can manage their profile and address book through the canonical customer actions: `CustomerUpdateAction`, `AddressGetAllAction`, `CustomerAddressCreateAction`, `CustomerAddressUpdateAction`, `CustomerAddressDeleteAction` and `CustomerAddressSetDefaultAction`.

`CustomerGetCurrentAction` fills `addresses` and `phone`, read with the customer in a single Store API call. `addresses` holds the same entries `AddressGetAllAction` returns: each address with its `id`, and `isDefaultBilling` and `isDefaultShipping` set on the customer's defaults. One address can be both.

- An address's `countryCode` is the ISO 3166-1 alpha-2 code, and its `provinceCode` the ISO 3166-2 subdivision code without the country: Shopware's state `DE-BY` reads as `BY`. A write accepts both `BY` and `DE-BY`.
- Shopware keeps phone numbers on addresses, so the customer's `phone` is the phone of the default billing address, and `CustomerUpdateAction` writes it there.
- Updates are partial: the stored profile or address fills in whatever the input leaves out.
- `CustomerUpdateAction` writes the `customFields` the shop lets the Store API write to a customer. Before Shopware 6.6 the app asks the Admin API which those are and writes none without Admin API credentials: Shopware 6.5 erases every custom field of a customer when none of the sent ones is writable.
- Errors use the canonical types: `UnauthenticatedError` for a guest, `AddressNotFoundError` for an address the customer does not have, `AddressNotDeletableError` when Shopware refuses to delete a default address (or, before Shopware 6.7.3, the address active in the current context), and `InvalidFieldError` for a validation failure, with the canonical field path. A value longer than Shopware stores, which Shopware 6.5 does not validate, arrives as `TOO_LONG` on its field instead of as a server error.
