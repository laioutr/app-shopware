import type { StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';

/** Associations an address read needs: the state's short code is the only part not in the system entities. */
export const addressAssociations = { countryState: {} };

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
