import { beforeEach, describe, expect, it, vi } from 'vitest';
import checkResetLink from './check-reset-link.action';
import confirmEmail from './confirm-email.action';
import resetPassword from './reset-password.action';
import {
  EmailConfirmationTokenInvalidError,
  InvalidFieldError,
  PasswordResetTokenInvalidError,
} from '@laioutr-core/canonical-types/ecommerce';
import { persistContextToken } from '../../shopware-helper/persistContextToken';

vi.mock('../../middleware/defineShopware', () => ({
  defineShopwareAction: (_token: unknown, run: unknown) => run,
}));
vi.mock('../../shopware-helper/persistContextToken', () => ({
  persistContextToken: vi.fn().mockResolvedValue(undefined),
}));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (handler: unknown, input: unknown) => (handler as Run)({ context, input, event });

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
};

const recoveryLink = 'https://shop.example.com/account/recover/password?hash=recovery-hash';
const confirmLink = 'https://shop.example.com/registration/confirm?em=email-hash&hash=confirm-hash';

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
  vi.mocked(persistContextToken).mockClear();
  contextChanged = undefined;
});

describe('reset password', () => {
  it("sets the new password with the link's hash and keeps no token", async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { success: true } });

    await run(resetPassword, { link: recoveryLink, newPassword: 'new-secret' });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('recoveryPassword post /account/recovery-password-confirm', {
      body: { hash: 'recovery-hash', newPassword: 'new-secret', newPasswordConfirm: 'new-secret' },
    });
    expect(context.storefrontClient.hook).not.toHaveBeenCalled();
  });

  it('refuses a link without a hash before asking Shopware', async () => {
    const result = run(resetPassword, { link: 'https://shop.example.com/account/recover/password', newPassword: 'new-secret' });

    await expect(result).rejects.toBeInstanceOf(PasswordResetTokenInvalidError);
    await expect(result).rejects.toMatchObject({ data: { reason: 'invalid' } });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('throws an expired hash with its reason', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(410, [{ code: 'CHECKOUT__CUSTOMER_RECOVERY_HASH_EXPIRED' }]));

    await expect(run(resetPassword, { link: recoveryLink, newPassword: 'new-secret' })).rejects.toMatchObject({
      data: { reason: 'expired' },
    });
  });

  it('reports the password policy on newPassword, also when Shopware names the confirmation', async () => {
    context.storefrontClient.invoke.mockRejectedValue(
      apiError(400, [{ code: 'VIOLATION::TOO_SHORT_ERROR', source: { pointer: '/newPasswordConfirm' } }])
    );

    const result = run(resetPassword, { link: recoveryLink, newPassword: 'short' });

    await expect(result).rejects.toBeInstanceOf(InvalidFieldError);
    await expect(result).rejects.toMatchObject({ data: { reason: 'TOO_SHORT', field: ['newPassword'] } });
  });

  it('passes an outage on', async () => {
    const outage = apiError(503);
    context.storefrontClient.invoke.mockRejectedValue(outage);

    await expect(run(resetPassword, { link: recoveryLink, newPassword: 'new-secret' })).rejects.toBe(outage);
  });
});

describe('check reset link', () => {
  it.each([
    [{ isExpired: false, apiAlias: 'array_struct' }, 'valid'],
    [{ isExpired: true, apiAlias: 'array_struct' }, 'expired'],
    [{ apiAlias: 'array_struct', data: [{ isExpired: true }] }, 'expired'],
  ])('answers %o as %s', async (data, status) => {
    context.storefrontClient.invoke.mockResolvedValue({ data });

    await expect(run(checkResetLink, { link: recoveryLink })).resolves.toEqual({ status });
    expect(context.storefrontClient.invoke).toHaveBeenCalledWith(
      'getCustomerRecoveryIsExpired post /account/customer-recovery-is-expired',
      {
        body: { hash: 'recovery-hash' },
      }
    );
  });

  it('answers a hash Shopware does not know as invalid', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(404, [{ code: 'CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH' }]));

    await expect(run(checkResetLink, { link: recoveryLink })).resolves.toEqual({ status: 'invalid' });
  });

  it('answers a link without a hash as invalid without asking Shopware', async () => {
    await expect(run(checkResetLink, { link: 'https://shop.example.com/' })).resolves.toEqual({ status: 'invalid' });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('answers valid when Shopware sends no readable flag, leaving the reset to decide', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: { apiAlias: 'array_struct' } });

    await expect(run(checkResetLink, { link: recoveryLink })).resolves.toEqual({ status: 'valid' });
  });
});

describe('confirm email', () => {
  it('confirms with hash and em and persists the token Shopware signs the customer in with', async () => {
    context.storefrontClient.invoke.mockImplementation(async () => {
      contextChanged?.('customer-token');
      return { data: {} };
    });

    await expect(run(confirmEmail, { link: confirmLink })).resolves.toEqual({ status: 'signed-in' });
    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('registerConfirm post /account/register-confirm', {
      body: { hash: 'confirm-hash', em: 'email-hash' },
    });
    expect(persistContextToken).toHaveBeenCalledWith(event, 'customer-token');
  });

  it('answers confirmed when no new token arrived', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: {} });

    await expect(run(confirmEmail, { link: confirmLink })).resolves.toEqual({ status: 'confirmed' });
    expect(persistContextToken).not.toHaveBeenCalled();
  });

  it('answers confirmed for a link opened a second time', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(412, [{ code: 'CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED' }]));

    await expect(run(confirmEmail, { link: confirmLink })).resolves.toEqual({ status: 'confirmed' });
  });

  it('throws EmailConfirmationTokenInvalidError for a hash Shopware does not know', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(404, [{ code: 'CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH' }]));

    await expect(run(confirmEmail, { link: confirmLink })).rejects.toBeInstanceOf(EmailConfirmationTokenInvalidError);
  });

  it('throws EmailConfirmationTokenInvalidError for a link without em, without asking Shopware', async () => {
    await expect(run(confirmEmail, { link: 'https://shop.example.com/registration/confirm?hash=x' })).rejects.toBeInstanceOf(
      EmailConfirmationTokenInvalidError
    );
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });
});
