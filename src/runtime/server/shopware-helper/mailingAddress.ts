import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import type { StorefrontClient } from '../types/shopware';
import type { Schemas } from '../types/storeApiTypes';
import type { SwSystemEntities } from './system/getSystemEntities';
import type { MailingAddress } from '@laioutr-core/canonical-types';
import type { z } from 'zod/v4';

export type CanonicalAddress = z.output<typeof MailingAddress>;

type Country = SwSystemEntities['countries'][number];
type Salutation = SwSystemEntities['salutations'][number];

export type ShopwareAddressIds = { countryId?: string; countryStateId?: string; salutationId?: string };

export const findCountry = (countries: Country[], countryCode: string): Country | undefined =>
  countries.find((country) => country.iso?.toUpperCase() === countryCode.toUpperCase());

/**
 * The salutation id for a canonical salutation key. Shopware requires one on every customer and
 * address, so an absent or unknown key falls back to the shop's `not_specified` salutation.
 */
export const findSalutationId = (salutations: Salutation[], key: string | undefined): string | undefined =>
  (key ? salutations.find((salutation) => salutation.key === key) : undefined)?.id ??
  salutations.find((salutation) => salutation.key === 'not_specified')?.id;

/**
 * Shopware's state short codes are ISO 3166-2 (`DE-BY`). Both that form and the bare subdivision
 * part (`BY`) are accepted, since the canonical `provinceCode` does not pin one down.
 */
export const matchCountryState = (
  states: Pick<Schemas['CountryState'], 'id' | 'shortCode'>[],
  countryCode: string,
  provinceCode: string
): string | undefined => {
  const wanted = provinceCode.toUpperCase();
  const qualified = `${countryCode.toUpperCase()}-${wanted}`;
  return states.find((state) => {
    const shortCode = state.shortCode.toUpperCase();
    return shortCode === wanted || shortCode === qualified;
  })?.id;
};

/**
 * Resolve the ids Shopware wants for an address's country, state and salutation.
 *
 * A `complete` address (register, create) always gets a salutation, since Shopware requires one. A
 * partial address (update) resolves only what it carries; its state is resolved against its country,
 * so a `provinceCode` without a `countryCode` is rejected rather than matched against a guess.
 */
export const resolveAddressIds = async (
  client: StorefrontClient,
  systemEntities: SwSystemEntities,
  address: Partial<CanonicalAddress>,
  { fieldPrefix, complete }: { fieldPrefix: string[]; complete: boolean }
): Promise<ShopwareAddressIds> => {
  const ids: ShopwareAddressIds = {};

  if (address.countryCode !== undefined) {
    const country = findCountry(systemEntities.countries, address.countryCode);
    if (!country) throw new InvalidFieldError('INVALID_VALUE', [...fieldPrefix, 'countryCode']);
    ids.countryId = country.id;

    if (address.provinceCode) {
      const response = await client.invoke('readCountryState post /country-state/{countryId}', {
        pathParams: { countryId: country.id },
        body: { includes: { country_state: ['id', 'shortCode'] } },
      });
      const countryStateId = matchCountryState(response.data.elements ?? [], address.countryCode, address.provinceCode);
      if (!countryStateId) throw new InvalidFieldError('INVALID_VALUE', [...fieldPrefix, 'provinceCode']);
      ids.countryStateId = countryStateId;
    }
  } else if (address.provinceCode) {
    throw new InvalidFieldError('MISSING', [...fieldPrefix, 'countryCode']);
  }

  if (complete || address.salutation !== undefined) {
    ids.salutationId = findSalutationId(systemEntities.salutations, address.salutation);
  }

  return ids;
};

/**
 * Map a canonical address onto Shopware's address body. Only fields the input carries are written,
 * so the same mapping serves a full address (register, create) and a partial one (update).
 */
export const toShopwareAddressBody = (
  address: Partial<CanonicalAddress>,
  ids: ShopwareAddressIds
): Partial<Schemas['CustomerAddressBody']> => {
  const body: Partial<Schemas['CustomerAddressBody']> = {
    firstName: address.firstName,
    lastName: address.lastName,
    title: address.title,
    company: address.company,
    street: address.address1,
    additionalAddressLine1: address.address2,
    zipcode: address.postalCode,
    city: address.city,
    phoneNumber: address.phone,
    ...ids,
  };

  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
};

/**
 * Map a Shopware address onto the canonical one. Country and salutation resolve through the sales
 * channel's system entities, so only the state needs the `countryState` association on the read.
 */
export const fromShopwareAddress = (address: Schemas['CustomerAddress'], systemEntities: SwSystemEntities): CanonicalAddress => {
  const salutation = systemEntities.salutations.find((entry) => entry.id === address.salutationId)?.key;
  const countryCode = address.country?.iso ?? systemEntities.countries.find((country) => country.id === address.countryId)?.iso ?? '';

  return {
    firstName: address.firstName,
    lastName: address.lastName,
    ...(salutation && salutation !== 'not_specified' ? { salutation } : {}),
    ...(address.title ? { title: address.title } : {}),
    ...(address.company ? { company: address.company } : {}),
    ...(address.phoneNumber ? { phone: address.phoneNumber } : {}),
    address1: address.street,
    ...(address.additionalAddressLine1 ? { address2: address.additionalAddressLine1 } : {}),
    city: address.city,
    postalCode: address.zipcode ?? '',
    countryCode,
    ...(address.countryState?.shortCode ? { provinceCode: address.countryState.shortCode } : {}),
  };
};

/** The writable fields of a stored Shopware address, as the base an update overlays. */
export const toShopwareAddressBodyFromStored = (address: Schemas['CustomerAddress']): Partial<Schemas['CustomerAddressBody']> => {
  const body: Partial<Schemas['CustomerAddressBody']> = {
    firstName: address.firstName,
    lastName: address.lastName,
    salutationId: address.salutationId,
    title: address.title,
    company: address.company,
    department: address.department,
    street: address.street,
    additionalAddressLine1: address.additionalAddressLine1,
    additionalAddressLine2: address.additionalAddressLine2,
    zipcode: address.zipcode,
    city: address.city,
    countryId: address.countryId,
    countryStateId: address.countryStateId,
    phoneNumber: address.phoneNumber,
  };

  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
};

/**
 * Overlay a canonical partial address on a stored one. A changed country drops the stored state,
 * which belongs to the old country, unless the update names a new one.
 */
export const mergeShopwareAddressBody = (
  stored: Schemas['CustomerAddress'],
  update: Partial<CanonicalAddress>,
  ids: ShopwareAddressIds
): Partial<Schemas['CustomerAddressBody']> => {
  const base = toShopwareAddressBodyFromStored(stored);
  if (ids.countryId && ids.countryId !== stored.countryId && !ids.countryStateId) delete base.countryStateId;
  return { ...base, ...toShopwareAddressBody(update, ids) };
};
