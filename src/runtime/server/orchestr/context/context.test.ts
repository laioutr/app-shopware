import { beforeEach, describe, expect, it, vi } from 'vitest';
import get from './get.action';
import update from './update.action';
import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, run: unknown) => run }));
vi.mock('../../shopware-helper/persistContextToken', () => ({ persistContextToken: vi.fn().mockResolvedValue(undefined) }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (handler: unknown, input?: unknown) => (handler as Run)({ context, input, event });

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

const event = { id: 'event' };
let contextChanged: ((token: string) => void) | undefined;

const context = {
  languageId: 'lang-de',
  currency: 'EUR',
  storefrontClient: {
    invoke: vi.fn(),
    hook: vi.fn((name: string, callback: (token: string) => void) => {
      if (name === 'onContextChanged') contextChanged = callback;
    }),
  },
  systemEntities: {
    countries: [
      { id: 'country-de', iso: 'DE' },
      { id: 'country-at', iso: 'AT' },
    ],
    locales: [{ languageId: 'lang-de', iso: 'de-DE' }],
  },
};

const standard = { id: 'sm-standard', name: 'Standard', translated: { name: 'Standardversand', description: 'Two to four days' } };
const express = { id: 'sm-express', name: 'Express', translated: { name: 'Express' } };
const invoice = { id: 'pm-invoice', name: 'Invoice', translated: { name: 'Rechnung', description: '' } };

const respond = (table: Record<string, unknown>) =>
  context.storefrontClient.invoke.mockImplementation(async (operation: string) => {
    if (!(operation in table)) throw new Error(`unexpected call ${operation}`);
    const answer = table[operation];
    if (answer instanceof Error) throw answer;
    return { data: answer };
  });

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
  context.storefrontClient.hook.mockClear();
  vi.mocked(persistContextToken).mockClear();
  contextChanged = undefined;
});

describe('context get', () => {
  it('answers the session with the methods to choose from, in the request language', async () => {
    respond({
      'readContext get /context': {
        apiAlias: 'sales_channel_context',
        context: { languageIdChain: ['lang-de'] },
        currency: { isoCode: 'EUR' },
        shippingLocation: { country: { id: 'country-at', iso: 'AT' } },
        shippingMethod: standard,
        paymentMethod: invoice,
        customer: { id: 'customer-1', guest: false, defaultPaymentMethodId: 'pm-invoice' },
      },
      'readShippingMethod post /shipping-method': { elements: [standard, express] },
      'readPaymentMethod post /payment-method': { elements: [invoice] },
    });

    await expect(run(get)).resolves.toEqual({
      signedIn: true,
      currency: 'EUR',
      locale: 'de-DE',
      countryCode: 'AT',
      shippingMethod: { id: 'sm-standard', name: 'Standardversand', description: 'Two to four days' },
      paymentMethod: { id: 'pm-invoice', name: 'Rechnung' },
      defaultPaymentMethodId: 'pm-invoice',
      shippingMethods: [
        { id: 'sm-standard', name: 'Standardversand', description: 'Two to four days' },
        { id: 'sm-express', name: 'Express' },
      ],
      paymentMethods: [{ id: 'pm-invoice', name: 'Rechnung' }],
    });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('readShippingMethod post /shipping-method', {
      query: { onlyAvailable: true },
      body: {},
    });
    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('readPaymentMethod post /payment-method', {
      body: { onlyAvailable: true },
    });
  });

  it('answers a guest as signed out and persists no token', async () => {
    respond({
      'readContext get /context': { apiAlias: 'sales_channel_context', currency: { isoCode: 'EUR' } },
      'readShippingMethod post /shipping-method': { elements: [] },
      'readPaymentMethod post /payment-method': {},
    });

    await expect(run(get)).resolves.toMatchObject({ signedIn: false, locale: 'de-DE', shippingMethods: [], paymentMethods: [] });
    expect(context.storefrontClient.hook).not.toHaveBeenCalled();
  });

  it('answers a guest customer of a guest checkout as signed out', async () => {
    respond({
      'readContext get /context': { apiAlias: 'sales_channel_context', customer: { id: 'guest-1', guest: true } },
      'readShippingMethod post /shipping-method': { elements: [] },
      'readPaymentMethod post /payment-method': { elements: [] },
    });

    await expect(run(get)).resolves.toMatchObject({ signedIn: false, currency: 'EUR' });
  });
});

describe('context update', () => {
  it('switches the given fields, with the country by its code, and persists a new token', async () => {
    context.storefrontClient.invoke.mockImplementation(async () => {
      contextChanged?.('new-guest-token');
      return { data: {} };
    });

    await run(update, { shippingMethodId: 'sm-express', countryCode: 'at' });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('updateContext patch /context', {
      body: { shippingMethodId: 'sm-express', countryId: 'country-at' },
    });
    expect(persistContextToken).toHaveBeenCalledWith(event, 'new-guest-token');
  });

  it('sends nothing for an empty input', async () => {
    await run(update, {});

    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('refuses a country the sales channel does not offer without asking Shopware', async () => {
    await expect(run(update, { countryCode: 'FR' })).rejects.toMatchObject({ data: { reason: 'INVALID_VALUE', field: ['countryCode'] } });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it("reports Shopware's refusal of a method on the field that named it", async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::ENTITY_DOES_NOT_EXIST', source: { pointer: '/paymentMethodId' } }])
    );

    const result = run(update, { paymentMethodId: 'pm-unknown' });
    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { field: ['paymentMethodId'] } });
  });
});
