import { beforeEach, describe, expect, it, vi } from 'vitest';
import login from './login.action';
import logout from './logout.action';
import recover from './recover.action';
import register from './register.action';
import { CustomerNotConfirmedError, EmailAlreadyInUseError, InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import { clearContextToken, persistContextToken } from '../../shopware-helper/persistContextToken';

const runtimeConfig = { '@laioutr/app-shopware': { storefrontUrl: 'https://shop.example.com' as string | undefined } };

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }));
vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, run: unknown) => run,
}));
vi.mock('../../shopware-helper/persistContextToken', () => ({
  persistContextToken: vi.fn().mockResolvedValue(undefined),
  clearContextToken: vi.fn().mockResolvedValue(undefined),
}));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

const event = { id: 'event' };
let contextChanged: ((token: string) => void) | undefined;

const context = {
  storefrontClient: {
    invoke: vi.fn(),
    hook: vi.fn((name: string, callback: (token: string) => void) => {
      if (name === 'onContextChanged') contextChanged = callback;
    }),
  },
  systemEntities: {
    countries: [{ id: 'country-de', iso: 'DE' }],
    salutations: [
      { id: 'sal-mrs', key: 'mrs' },
      { id: 'sal-none', key: 'not_specified' },
    ],
  },
};

const registerInput = {
  email: 'ada@example.com',
  password: 'secret-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  salutation: 'mrs',
  address: { firstName: 'Ada', lastName: 'Lovelace', address1: 'Main St 1', postalCode: '10115', city: 'Berlin', countryCode: 'DE' },
};

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
  context.storefrontClient.hook.mockClear();
  vi.mocked(persistContextToken).mockClear();
  vi.mocked(clearContextToken).mockClear();
  contextChanged = undefined;
  runtimeConfig['@laioutr/app-shopware'].storefrontUrl = 'https://shop.example.com';
});

describe('logout', () => {
  it('logs out of Shopware and clears the context token', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: {} });

    await (logout as unknown as Run)({ context, event });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('logoutCustomer post /account/logout', {
      body: { 'replace-token': true },
    });
    expect(clearContextToken).toHaveBeenCalledWith(event);
  });

  it('clears the token of a context that has no customer', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(403));

    await (logout as unknown as Run)({ context, event });

    expect(clearContextToken).toHaveBeenCalledWith(event);
  });

  it('keeps the token when Shopware fails otherwise', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(500));

    await expect((logout as unknown as Run)({ context, event })).rejects.toThrow();
    expect(clearContextToken).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  it('registers with the address as billing address and persists the new token', async () => {
    context.storefrontClient.invoke.mockImplementation(async () => {
      contextChanged?.('customer-token');
      return { data: {} };
    });

    const result = await (register as unknown as Run)({ context, input: registerInput, event });

    expect(result).toEqual({ status: 'signed-in' });
    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('register post /account/register', {
      body: expect.objectContaining({
        email: 'ada@example.com',
        salutationId: 'sal-mrs',
        storefrontUrl: 'https://shop.example.com',
        acceptedDataProtection: true,
        billingAddress: expect.objectContaining({
          street: 'Main St 1',
          zipcode: '10115',
          countryId: 'country-de',
          salutationId: 'sal-mrs',
        }),
      }),
    });
    expect(persistContextToken).toHaveBeenCalledWith(event, 'customer-token');
  });

  it('answers pending-confirmation when the sales channel requires double opt-in', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { doubleOptInRegistration: true } });

    const result = await (register as unknown as Run)({ context, input: registerInput, event });

    expect(result).toEqual({ status: 'pending-confirmation' });
    expect(persistContextToken).not.toHaveBeenCalled();
  });

  it("sends the customer's privacy policy choice", async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: {} });

    await (register as unknown as Run)({ context, input: { ...registerInput, consents: { privacyPolicy: false } }, event });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('register post /account/register', {
      body: expect.objectContaining({ acceptedDataProtection: false }),
    });
  });

  it('turns a Shopware violation into an InvalidFieldError', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::IS_BLANK_ERROR', source: { pointer: '/billingAddress/zipcode' } }])
    );

    const result = (register as unknown as Run)({ context, input: registerInput, event });

    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { reason: 'MISSING', field: ['address', 'postalCode'] } });
  });

  it('reports a missing data protection consent on the canonical consent', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::IS_BLANK_ERROR', source: { pointer: '/acceptedDataProtection' } }])
    );

    await expect((register as unknown as Run)({ context, input: registerInput, event })).rejects.toMatchObject({
      data: { reason: 'MISSING', field: ['consents', 'privacyPolicy'] },
    });
  });

  it('throws EmailAlreadyInUseError when an account has the address', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE', source: { pointer: '/email' } }])
    );

    await expect((register as unknown as Run)({ context, input: registerInput, event })).rejects.toBeInstanceOf(
      EmailAlreadyInUseError
    );
  });

  it('refuses to register without a storefront URL', async () => {
    runtimeConfig['@laioutr/app-shopware'].storefrontUrl = undefined;

    await expect((register as unknown as Run)({ context, input: registerInput, event })).rejects.toThrow(/storefrontUrl/);
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  const credentials = { email: 'ada@example.com', password: 'secret-password' };

  it('throws CustomerNotConfirmedError for a customer who has not confirmed the opt-in mail', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(401, [{ code: 'CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED' }]));

    await expect((login as unknown as Run)({ context, input: credentials, event })).rejects.toBeInstanceOf(
      CustomerNotConfirmedError
    );
  });

  it('throws CustomerNotConfirmedError for the inactive customer Shopware 6.5 reports instead', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(401, [{ code: 'CHECKOUT__CUSTOMER_IS_INACTIVE' }]));

    await expect((login as unknown as Run)({ context, input: credentials, event })).rejects.toBeInstanceOf(
      CustomerNotConfirmedError
    );
  });

  it('answers unsuccessfully for wrong credentials', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(401, [{ code: 'CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS' }]));

    await expect((login as unknown as Run)({ context, input: credentials, event })).resolves.toMatchObject({ success: false });
  });
});

describe('recover', () => {
  it('sends the recovery mail with the configured storefront URL', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await (recover as unknown as Run)({ context, input: { email: 'ada@example.com' } });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('sendRecoveryMail post /account/recovery-password', {
      body: { email: 'ada@example.com', storefrontUrl: 'https://shop.example.com' },
    });
  });

  it('answers an address without an account like any other', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(404));

    await expect((recover as unknown as Run)({ context, input: { email: 'nobody@example.com' } })).resolves.toBeUndefined();
  });

  it('passes other failures on', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(429));

    await expect((recover as unknown as Run)({ context, input: { email: 'ada@example.com' } })).rejects.toThrow();
  });
});
