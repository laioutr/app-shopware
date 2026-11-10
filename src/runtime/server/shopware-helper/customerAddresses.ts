import { fromShopwareAddress } from './mailingAddress';
import type { StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';
import type { SwSystemEntities } from './system/getSystemEntities';
import type { AddressBookEntry } from '@laioutr-core/canonical-types';
import type { z } from 'zod/v4';

/**
 * Associations an address read needs: the state's short code, and the country, which the system
 * entities lack once the sales channel no longer sells to it.
 */
export const addressAssociations = { country: {}, countryState: {} };

/** The customer's addresses, or only the one with `id`. */
export const listCustomerAddresses = async (client: StorefrontClient, id?: string): Promise<Schemas['CustomerAddress'][]> => {
  const response = await client.invoke('listAddress post /account/list-address', {
    body: { ...(id ? { ids: [id] } : {}), associations: addressAssociations },
  });
  return response.data.elements ?? [];
};

/** The customer with every address and both default ids — one read for the account overview. */
export const readCustomerWithAddresses = async (client: StorefrontClient): Promise<Schemas['Customer']> => {
  const response = await client.invoke('readCustomer post /account/customer', {
    body: { associations: { addresses: { associations: addressAssociations } } },
  });
  return response.data;
};

export const readCustomer = async (client: StorefrontClient): Promise<Schemas['Customer']> => {
  const response = await client.invoke('readCustomer post /account/customer', {});
  return response.data;
};

/** The addresses of a customer read with {@link readCustomerWithAddresses}, each flagged with the defaults it is. */
export const toAddressBookEntries = (
  customer: Schemas['Customer'],
  systemEntities: SwSystemEntities
): z.output<typeof AddressBookEntry>[] =>
  (customer.addresses ?? []).map((address) => ({
    id: address.id,
    address: fromShopwareAddress(address, systemEntities),
    isDefaultBilling: address.id === customer.defaultBillingAddressId,
    isDefaultShipping: address.id === customer.defaultShippingAddressId,
  }));
