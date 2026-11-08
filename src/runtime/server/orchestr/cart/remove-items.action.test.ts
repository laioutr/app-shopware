import { describe, expect, it, vi } from 'vitest';
import removeItemsAction from './remove-items.action';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, handler: unknown) => handler }));
vi.mock('../../shopware-helper/persistContextToken', () => ({ persistContextToken: vi.fn() }));

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

const paymentBlocked = { key: 'payment-method-blocked-Invoice', messageKey: 'payment-method-blocked', level: 10, block: true };

const run = (errors: unknown[]) =>
  (removeItemsAction as unknown as Handler)({
    event: {},
    context: { storefrontClient: { invoke: vi.fn(async () => ({ data: { token: 't', errors } })) } },
    input: ['variant-1'],
  });

describe('CartRemoveItemsAction', () => {
  it('answers what the write changed, but not what stands on the cart', async () => {
    expect(
      await run([
        paymentBlocked,
        { key: 'promotion-discount-deleted', messageKey: 'promotion-discount-deleted', level: 0, message: 'Discount Spring removed' },
      ])
    ).toEqual({
      messages: [{ code: 'promotion-discount-deleted', level: 'info', message: 'Discount Spring removed', blocksCheckout: false }],
    });
  });

  it('answers nothing when the write changed nothing beyond what it was asked', async () => {
    expect(await run([paymentBlocked])).toBeUndefined();
  });
});
