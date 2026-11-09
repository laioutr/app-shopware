import { beforeEach, describe, expect, it, vi } from 'vitest';
import changeEmail from './change-email.action';
import changeLanguage from './change-language.action';
import changePassword from './change-password.action';
import deleteCustomer from './delete.action';
import getNewsletterStatus from './get-newsletter-status.action';
import setDefaultPaymentMethod from './payment-method-set-default.action';
import {
  CurrentPasswordInvalidError,
  EmailAlreadyInUseError,
  InvalidFieldError,
  UnauthenticatedError,
} from '@laioutr-core/canonical-types/ecommerce';
import { clearContextToken, persistContextToken } from '../../shopware-helper/persistContextToken';

vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, run: unknown) => run,
}));
vi.mock('../../shopware-helper/persistContextToken', () => ({
  persistContextToken: vi.fn().mockResolvedValue(undefined),
  clearContextToken: vi.fn().mockResolvedValue(undefined),
}));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (handler: unknown, input?: unknown) => (handler as Run)({ context, input, event });

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });
const wrongPassword = () => apiError(400, [{ code: 'VIOLATION::CUSTOMER_PASSWORD_NOT_CORRECT', source: { pointer: '/password' } }]);

const event = { id: 'event' };
let contextChanged: ((token: string) => void) | undefined;

const context = {
  languageId: 'lang-de',
  storefrontClient: {
    invoke: vi.fn(),
    hook: vi.fn((name: string, callback: (token: string) => void) => {
      if (name === 'onContextChanged') contextChanged = callback;
    }),
  },
  systemEntities: {
    locales: [
      { languageId: 'lang-de', iso: 'de-DE' },
      { languageId: 'lang-en', iso: 'en-GB' },
    ],
  },
};

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
  vi.mocked(persistContextToken).mockClear();
  vi.mocked(clearContextToken).mockClear();
  contextChanged = undefined;
});

describe('change password', () => {
  const input = { currentPassword: 'old-secret', newPassword: 'new-secret' };

  it('changes the password and persists the token Shopware rotates to', async () => {
    context.storefrontClient.invoke.mockImplementation(async () => {
      contextChanged?.('rotated-token');
      return { data: { success: true } };
    });

    await run(changePassword, input);

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('changePassword post /account/change-password', {
      body: { password: 'old-secret', newPassword: 'new-secret', newPasswordConfirm: 'new-secret' },
    });
    expect(persistContextToken).toHaveBeenCalledWith(event, 'rotated-token');
  });

  it('throws CurrentPasswordInvalidError for a wrong current password', async () => {
    context.storefrontClient.invoke.mockRejectedValue(wrongPassword());

    await expect(run(changePassword, input)).rejects.toBeInstanceOf(CurrentPasswordInvalidError);
  });

  it('reports the password policy on newPassword', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::TOO_SHORT_ERROR', source: { pointer: '/newPassword' } }])
    );

    await expect(run(changePassword, input)).rejects.toMatchObject({ data: { reason: 'TOO_SHORT', field: ['newPassword'] } });
  });

  it('reports a missing current password on currentPassword', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::IS_BLANK_ERROR', source: { pointer: '/password' } }])
    );

    await expect(run(changePassword, input)).rejects.toMatchObject({ data: { reason: 'MISSING', field: ['currentPassword'] } });
  });

  it('throws UnauthenticatedError for a guest', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(403, [{ code: 'CHECKOUT__CUSTOMER_NOT_LOGGED_IN' }]));

    await expect(run(changePassword, input)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('change email', () => {
  const input = { email: 'new@example.com', currentPassword: 'secret' };

  it('changes the address, confirming it with itself', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await expect(run(changeEmail, input)).resolves.toEqual({ status: 'changed' });
    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('changeEmail post /account/change-email', {
      body: { email: 'new@example.com', emailConfirmation: 'new@example.com', password: 'secret' },
    });
    expect(context.storefrontClient.hook).toHaveBeenCalledWith('onContextChanged', expect.any(Function));
  });

  it('throws EmailAlreadyInUseError for an address another account has', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE', source: { pointer: '/email' } }])
    );

    await expect(run(changeEmail, input)).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('throws CurrentPasswordInvalidError for a wrong password', async () => {
    context.storefrontClient.invoke.mockRejectedValue(wrongPassword());

    await expect(run(changeEmail, input)).rejects.toBeInstanceOf(CurrentPasswordInvalidError);
  });

  it('reports an invalid address on email', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::INVALID_FORMAT_ERROR', source: { pointer: '/emailConfirmation' } }])
    );

    const result = run(changeEmail, input);
    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { field: ['email'] } });
  });
});

describe('delete customer', () => {
  it('deletes the customer and clears the context token', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: undefined });

    await run(deleteCustomer);

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('deleteCustomer delete /account/customer');
    expect(clearContextToken).toHaveBeenCalledWith(event);
  });

  it('throws UnauthenticatedError for a guest and keeps the token', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(403));

    await expect(run(deleteCustomer)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(clearContextToken).not.toHaveBeenCalled();
  });
});

describe('set default payment method', () => {
  it('sets the method by its id', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await run(setDefaultPaymentMethod, { paymentMethodId: 'pm-invoice' });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith(
      'changePaymentMethod post /account/change-payment-method/{paymentMethodId}',
      { pathParams: { paymentMethodId: 'pm-invoice' } }
    );
  });

  it.each([
    apiError(400, [{ code: 'CHECKOUT__UNKNOWN_PAYMENT_METHOD' }]),
    apiError(400, [{ code: 'FRAMEWORK__INVALID_UUID' }]),
    apiError(404),
  ])('reports a method the shop does not offer on paymentMethodId', async (err) => {
    context.storefrontClient.invoke.mockRejectedValue(err);

    const result = run(setDefaultPaymentMethod, { paymentMethodId: 'pm-unknown' });
    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { reason: 'INVALID_VALUE', field: ['paymentMethodId'] } });
  });

  it('throws UnauthenticatedError for a guest', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(403));

    await expect(run(setDefaultPaymentMethod, { paymentMethodId: 'pm-invoice' })).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('change language', () => {
  it("sets the request's language without a locale", async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await run(changeLanguage, {});

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('changeLanguage post /account/change-language', {
      body: { language: 'lang-de' },
    });
  });

  it('sets the language of a locale, matched regardless of case and separator', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await run(changeLanguage, { locale: 'en_gb' });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('changeLanguage post /account/change-language', {
      body: { language: 'lang-en' },
    });
  });

  it('refuses a locale the sales channel does not offer without asking Shopware', async () => {
    await expect(run(changeLanguage, { locale: 'fr-FR' })).rejects.toMatchObject({ data: { reason: 'INVALID_VALUE', field: ['locale'] } });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });
});

describe('newsletter status', () => {
  it.each([
    ['direct', 'subscribed'],
    ['optIn', 'subscribed'],
    ['notSet', 'pending-confirmation'],
    ['optOut', 'unsubscribed'],
    ['undefined', 'not-subscribed'],
    ['some-plugin-status', 'not-subscribed'],
  ])("answers Shopware's %s as %s", async (shopwareStatus, status) => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { apiAlias: 'account_newsletter_recipient', status: shopwareStatus } });

    await expect(run(getNewsletterStatus)).resolves.toEqual({ status });
  });

  it('throws UnauthenticatedError for a guest', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(403));

    await expect(run(getNewsletterStatus)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
