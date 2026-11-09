import { beforeEach, describe, expect, it, vi } from 'vitest';
import confirm from './confirm.action';
import unsubscribe from './unsubscribe.action';
import { EmailConfirmationTokenInvalidError } from '@laioutr-core/canonical-types/ecommerce';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, run: unknown) => run }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;
const run = (handler: unknown, input: unknown) => (handler as Run)({ context, input });

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

const context = { storefrontClient: { invoke: vi.fn() } };
const confirmLink = 'https://shop.example.com/newsletter-subscribe?em=email-hash&hash=subscribe-hash';

beforeEach(() => {
  context.storefrontClient.invoke.mockReset();
});

describe('newsletter confirm', () => {
  it("confirms with the link's hash and em", async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: undefined });

    await run(confirm, { link: confirmLink });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('confirmNewsletter post /newsletter/confirm', {
      body: { hash: 'subscribe-hash', em: 'email-hash' },
    });
  });

  it('throws EmailConfirmationTokenInvalidError for a subscription Shopware does not know', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(404, [{ code: 'CONTENT__NEWSLETTER_RECIPIENT_NOT_FOUND' }]));

    await expect(run(confirm, { link: confirmLink })).rejects.toBeInstanceOf(EmailConfirmationTokenInvalidError);
  });

  it('throws EmailConfirmationTokenInvalidError for a link without a hash, without asking Shopware', async () => {
    await expect(run(confirm, { link: 'https://shop.example.com/newsletter-subscribe?em=x' })).rejects.toBeInstanceOf(
      EmailConfirmationTokenInvalidError
    );
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });

  it('passes an outage on', async () => {
    const outage = apiError(503);
    context.storefrontClient.invoke.mockRejectedValue(outage);

    await expect(run(confirm, { link: confirmLink })).rejects.toBe(outage);
  });
});

describe('newsletter unsubscribe', () => {
  it('unsubscribes the address', async () => {
    context.storefrontClient.invoke.mockResolvedValue({ data: undefined });

    await run(unsubscribe, { email: 'ada@example.com' });

    expect(context.storefrontClient.invoke).toHaveBeenCalledWith('unsubscribeToNewsletter post /newsletter/unsubscribe', {
      body: { email: 'ada@example.com' },
    });
  });

  it('answers an address that is not subscribed like any other', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(404, [{ code: 'CONTENT__NEWSLETTER_RECIPIENT_NOT_FOUND' }]));

    await expect(run(unsubscribe, { email: 'nobody@example.com' })).resolves.toBeUndefined();
  });

  it('passes other failures on', async () => {
    context.storefrontClient.invoke.mockRejectedValue(apiError(429));

    await expect(run(unsubscribe, { email: 'ada@example.com' })).rejects.toThrow();
  });
});
