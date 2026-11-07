import { describe, expect, it, vi } from 'vitest';
import { findSalutationId, matchCountryState, resolveAddressIds, toShopwareAddressBody } from './mailingAddress';
import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';

const systemEntities = {
  currencies: [],
  locales: [],
  countries: [
    { id: 'country-de', iso: 'DE', iso3: 'DEU', name: 'Germany' },
    { id: 'country-at', iso: 'AT', iso3: 'AUT', name: 'Austria' },
  ],
  salutations: [
    { id: 'sal-mr', key: 'mr', displayName: 'Mr.' },
    { id: 'sal-none', key: 'not_specified', displayName: 'Not specified' },
  ],
} as never;

const clientWithStates = (states: { id: string; shortCode: string }[]) => ({
  invoke: vi.fn().mockResolvedValue({ data: { elements: states } }),
});

describe('findSalutationId', () => {
  it('finds a salutation by key and falls back to not_specified', () => {
    const { salutations } = systemEntities as { salutations: never[] };
    expect(findSalutationId(salutations, 'mr')).toBe('sal-mr');
    expect(findSalutationId(salutations, 'dr')).toBe('sal-none');
    expect(findSalutationId(salutations, undefined)).toBe('sal-none');
  });
});

describe('matchCountryState', () => {
  const states = [{ id: 'state-by', shortCode: 'DE-BY' }];

  it('accepts the ISO 3166-2 code and its bare subdivision part', () => {
    expect(matchCountryState(states, 'DE', 'DE-BY')).toBe('state-by');
    expect(matchCountryState(states, 'de', 'by')).toBe('state-by');
    expect(matchCountryState(states, 'DE', 'NW')).toBeUndefined();
  });
});

describe('resolveAddressIds', () => {
  it('resolves country, state and salutation of a complete address', async () => {
    const client = clientWithStates([{ id: 'state-by', shortCode: 'DE-BY' }]);

    const ids = await resolveAddressIds(
      client as never,
      systemEntities,
      { countryCode: 'de', provinceCode: 'BY', salutation: 'mr' },
      {
        fieldPrefix: ['address'],
        complete: true,
      }
    );

    expect(ids).toEqual({ countryId: 'country-de', countryStateId: 'state-by', salutationId: 'sal-mr' });
    expect(client.invoke).toHaveBeenCalledWith(
      'readCountryState post /country-state/{countryId}',
      expect.objectContaining({ pathParams: { countryId: 'country-de' } })
    );
  });

  it('rejects a country the sales channel does not ship to', async () => {
    const result = resolveAddressIds(
      clientWithStates([]) as never,
      systemEntities,
      { countryCode: 'FR' },
      { fieldPrefix: ['address'], complete: true }
    );

    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { reason: 'INVALID_VALUE', field: ['address', 'countryCode'] } });
  });

  it('rejects a province without a country on a partial address', async () => {
    await expect(
      resolveAddressIds(
        clientWithStates([]) as never,
        systemEntities,
        { provinceCode: 'BY' },
        { fieldPrefix: ['address'], complete: false }
      )
    ).rejects.toMatchObject({ data: { reason: 'MISSING', field: ['address', 'countryCode'] } });
  });

  it('leaves the salutation of a partial address alone unless it names one', async () => {
    const ids = await resolveAddressIds(
      clientWithStates([]) as never,
      systemEntities,
      { city: 'Berlin' },
      { fieldPrefix: [], complete: false }
    );
    expect(ids).toEqual({});
  });
});

describe('toShopwareAddressBody', () => {
  it('maps a canonical address onto Shopware fields', () => {
    expect(
      toShopwareAddressBody(
        {
          firstName: 'Ada',
          lastName: 'Lovelace',
          address1: 'Main St 1',
          address2: 'Floor 2',
          postalCode: '10115',
          city: 'Berlin',
          countryCode: 'DE',
          phone: '+49 30 1',
        },
        { countryId: 'country-de', salutationId: 'sal-none' }
      )
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      street: 'Main St 1',
      additionalAddressLine1: 'Floor 2',
      zipcode: '10115',
      city: 'Berlin',
      phoneNumber: '+49 30 1',
      countryId: 'country-de',
      salutationId: 'sal-none',
    });
  });

  it('writes only the fields a partial address carries', () => {
    expect(toShopwareAddressBody({ city: 'Munich' }, {})).toEqual({ city: 'Munich' });
  });
});
