import { beforeEach, describe, expect, it, vi } from 'vitest';
import addressCreate from './address-create.action';
import addressDelete from './address-delete.action';
import addressGetAll from './address-get-all.action';
import addressSetDefault from './address-set-default.action';
import addressUpdate from './address-update.action';
import getCurrent from './get-current.action';
import update from './update.action';
import { AddressNotFoundError, InvalidFieldError, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';

vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, run: unknown) => run,
}));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (handler: unknown, args: Record<string, unknown>) => (handler as Run)({ context, ...args });

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

/** Shopware before 6.7 lets an over-long value reach the database, which answers MySQL's error 1406. */
const overflow = (column: string) => apiError(500, [{ code: '1406', detail: `Data too long for column '${column}' at row 1` }]);

const billing = {
  id: 'addr-billing',
  firstName: 'Ada',
  lastName: 'Lovelace',
  salutationId: 'sal-mrs',
  street: 'Main St 1',
  zipcode: '10115',
  city: 'Berlin',
  countryId: 'country-de',
  phoneNumber: '+49 30 1',
};
const shipping = { ...billing, id: 'addr-shipping', street: 'Side St 2', phoneNumber: undefined };

const customer = {
  id: 'customer-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  salutationId: 'sal-mrs',
  title: 'Dr.',
  defaultBillingAddressId: 'addr-billing',
  defaultShippingAddressId: 'addr-shipping',
  addresses: [billing, shipping],
};

const context = {
  storefrontClient: { invoke: vi.fn() },
  systemEntities: {
    countries: [
      { id: 'country-de', iso: 'DE' },
      { id: 'country-at', iso: 'AT' },
    ],
    salutations: [
      { id: 'sal-mrs', key: 'mrs' },
      { id: 'sal-mr', key: 'mr' },
      { id: 'sal-none', key: 'not_specified' },
    ],
  },
};

/** Answer each Store API operation from a table; unknown operations fail the test loudly. */
const respond = (table: Record<string, unknown>) =>
  context.storefrontClient.invoke.mockImplementation(async (operation: string) => {
    if (!(operation in table)) throw new Error(`unexpected call ${operation}`);
    const answer = table[operation];
    if (answer instanceof Error) throw answer;
    return { data: answer };
  });

const callsTo = (operation: string) => context.storefrontClient.invoke.mock.calls.filter(([name]) => name === operation);

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
});

describe('get-current', () => {
  it('reads the customer and their addresses in one call', async () => {
    respond({ 'readCustomer post /account/customer': customer });

    const result = (await run(getCurrent, {})) as { customer: Record<string, unknown> };

    expect(context.storefrontClient.invoke).toHaveBeenCalledTimes(1);
    expect(result.customer).toMatchObject({
      id: 'customer-1',
      email: 'ada@example.com',
      phone: '+49 30 1',
      displayName: 'Ada Lovelace',
      person: { firstName: 'Ada', lastName: 'Lovelace', salutation: 'mrs', title: 'Dr.' },
      defaultBillingAddress: { address1: 'Main St 1', countryCode: 'DE' },
      defaultShippingAddress: { address1: 'Side St 2' },
    });
    expect(result.customer.addresses).toHaveLength(2);
  });

  it('answers a guest context as unauthenticated', async () => {
    respond({ 'readCustomer post /account/customer': apiError(403) });

    await expect(run(getCurrent, {})).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('update', () => {
  it('fills the fields change-profile requires from the stored customer', async () => {
    respond({ 'readCustomer post /account/customer': customer, 'changeProfile post /account/change-profile': { success: true } });

    await run(update, { input: { person: { firstName: 'Augusta' } } });

    expect(callsTo('changeProfile post /account/change-profile')[0]?.[1]).toEqual({
      body: { firstName: 'Augusta', lastName: 'Lovelace', salutationId: 'sal-mrs', title: 'Dr.', company: undefined },
    });
  });

  it('writes a phone number to the default billing address', async () => {
    respond({
      'readCustomer post /account/customer': customer,
      'listAddress post /account/list-address': { elements: [billing] },
      'updateCustomerAddress patch /account/address/{addressId}': billing,
    });

    await run(update, { input: { phone: '+49 89 2' } });

    expect(callsTo('changeProfile post /account/change-profile')).toHaveLength(0);
    expect(callsTo('updateCustomerAddress patch /account/address/{addressId}')[0]?.[1]).toMatchObject({
      pathParams: { addressId: 'addr-billing' },
      body: { street: 'Main St 1', phoneNumber: '+49 89 2' },
    });
  });

  it('places a profile violation under person', async () => {
    respond({
      'readCustomer post /account/customer': customer,
      'changeProfile post /account/change-profile': apiError(400, [
        { code: 'VIOLATION::TOO_LONG_ERROR', source: { pointer: '/lastName' } },
      ]),
    });

    await expect(run(update, { input: { person: { lastName: 'x'.repeat(300) } } })).rejects.toMatchObject({
      data: { reason: 'TOO_LONG', field: ['person', 'lastName'] },
    });
  });

  it('places an overflowed profile column under person', async () => {
    respond({
      'readCustomer post /account/customer': customer,
      'changeProfile post /account/change-profile': overflow('last_name'),
    });

    await expect(run(update, { input: { person: { lastName: 'x'.repeat(300) } } })).rejects.toMatchObject({
      data: { reason: 'TOO_LONG', field: ['person', 'lastName'] },
    });
  });

  it('places an overflowed phone number on phone', async () => {
    respond({
      'readCustomer post /account/customer': customer,
      'listAddress post /account/list-address': { elements: [billing] },
      'updateCustomerAddress patch /account/address/{addressId}': overflow('phone_number'),
    });

    await expect(run(update, { input: { phone: '1'.repeat(100) } })).rejects.toMatchObject({
      data: { reason: 'TOO_LONG', field: ['phone'] },
    });
  });
});

describe('address-get-all', () => {
  it('flags the default addresses', async () => {
    respond({ 'readCustomer post /account/customer': customer });

    const result = (await run(addressGetAll, {})) as { addresses: Record<string, unknown>[] };

    expect(result.addresses).toEqual([
      expect.objectContaining({ id: 'addr-billing', isDefaultBilling: true, isDefaultShipping: false }),
      expect.objectContaining({ id: 'addr-shipping', isDefaultBilling: false, isDefaultShipping: true }),
    ]);
  });
});

describe('address-create', () => {
  it('creates the address with resolved ids', async () => {
    respond({ 'createCustomerAddress post /account/address': billing });

    await run(addressCreate, {
      input: {
        address: { firstName: 'Ada', lastName: 'Lovelace', address1: 'New St 3', postalCode: '1010', city: 'Vienna', countryCode: 'AT' },
      },
    });

    expect(callsTo('createCustomerAddress post /account/address')[0]?.[1]).toEqual({
      body: expect.objectContaining({ street: 'New St 3', countryId: 'country-at', salutationId: 'sal-none' }),
    });
  });

  it('rejects an unknown country before calling Shopware', async () => {
    await expect(
      run(addressCreate, {
        input: { address: { firstName: 'A', lastName: 'B', address1: 'C', postalCode: 'D', city: 'E', countryCode: 'XX' } },
      })
    ).rejects.toBeInstanceOf(InvalidFieldError);
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('places an overflowed column on its address field', async () => {
    respond({ 'createCustomerAddress post /account/address': overflow('zipcode') });

    await expect(
      run(addressCreate, {
        input: { address: { firstName: 'A', lastName: 'B', address1: 'C', postalCode: '1'.repeat(100), city: 'E', countryCode: 'AT' } },
      })
    ).rejects.toMatchObject({ data: { reason: 'TOO_LONG', field: ['address', 'postalCode'] } });
  });
});

describe('address-update', () => {
  it('overlays the update on the stored address', async () => {
    respond({
      'listAddress post /account/list-address': { elements: [billing] },
      'updateCustomerAddress patch /account/address/{addressId}': billing,
    });

    await run(addressUpdate, { input: { id: 'addr-billing', address: { city: 'Potsdam' } } });

    expect(callsTo('updateCustomerAddress patch /account/address/{addressId}')[0]?.[1]).toEqual({
      pathParams: { addressId: 'addr-billing' },
      body: expect.objectContaining({
        street: 'Main St 1',
        zipcode: '10115',
        city: 'Potsdam',
        countryId: 'country-de',
        salutationId: 'sal-mrs',
      }),
    });
  });

  it('answers an address the customer does not have as not found', async () => {
    respond({ 'listAddress post /account/list-address': { elements: [] } });

    await expect(run(addressUpdate, { input: { id: 'addr-other', address: { city: 'X' } } })).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it('places an overflowed column on its address field', async () => {
    respond({
      'listAddress post /account/list-address': { elements: [billing] },
      'updateCustomerAddress patch /account/address/{addressId}': overflow('additional_address_line1'),
    });

    await expect(
      run(addressUpdate, { input: { id: 'addr-billing', address: { address2: 'x'.repeat(300) } } })
    ).rejects.toMatchObject({ data: { reason: 'TOO_LONG', field: ['address', 'address2'] } });
  });
});

describe('address-delete', () => {
  it('deletes the address', async () => {
    respond({ 'deleteCustomerAddress delete /account/address/{addressId}': undefined });

    await run(addressDelete, { input: { id: 'addr-shipping' } });

    expect(callsTo('deleteCustomerAddress delete /account/address/{addressId}')[0]?.[1]).toEqual({
      pathParams: { addressId: 'addr-shipping' },
    });
  });

  it('answers an unknown address as not found', async () => {
    respond({
      'deleteCustomerAddress delete /account/address/{addressId}': apiError(400, [{ code: 'CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND' }]),
    });

    await expect(run(addressDelete, { input: { id: 'addr-other' } })).rejects.toBeInstanceOf(AddressNotFoundError);
  });
});

describe('address-set-default', () => {
  it('sets the billing or the shipping default', async () => {
    respond({
      'defaultBillingAddress patch /account/address/default-billing/{addressId}': undefined,
      'defaultShippingAddress patch /account/address/default-shipping/{addressId}': undefined,
    });

    await run(addressSetDefault, { input: { id: 'addr-shipping', type: 'billing' } });
    await run(addressSetDefault, { input: { id: 'addr-billing', type: 'shipping' } });

    expect(callsTo('defaultBillingAddress patch /account/address/default-billing/{addressId}')[0]?.[1]).toEqual({
      pathParams: { addressId: 'addr-shipping' },
    });
    expect(callsTo('defaultShippingAddress patch /account/address/default-shipping/{addressId}')[0]?.[1]).toEqual({
      pathParams: { addressId: 'addr-billing' },
    });
  });
});
