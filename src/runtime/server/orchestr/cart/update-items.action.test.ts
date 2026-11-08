import { describe, expect, it, vi } from 'vitest';
import updateItemsAction from './update-items.action';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, handler: unknown) => handler }));
vi.mock('../../shopware-helper/persistContextToken', () => ({ persistContextToken: vi.fn() }));

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

const shippingBlocked = { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true };

const run = (errors: unknown[]) =>
  (updateItemsAction as unknown as Handler)({
    event: {},
    context: { storefrontClient: { invoke: vi.fn(async () => ({ data: { token: 't', errors } })) } },
    input: [{ itemId: 'variant-1', quantity: 5 }],
  });

describe('CartUpdateItemsAction', () => {
  it('answers what the write changed, but not what stands on the cart', async () => {
    expect(
      await run([
        shippingBlocked,
        { key: 'product-stock-reachedvariant-1', messageKey: 'product-stock-reached', level: 10, message: 'Only 3 left', block: true },
        { key: 'product-stock-reachedvariant-2', messageKey: 'product-stock-reached', level: 20, message: 'Only 1 left', block: true },
      ])
    ).toEqual({ messages: [{ code: 'quantity-adjusted', level: 'warning', message: 'Only 3 left', blocksCheckout: true }] });
  });

  it('answers nothing when the write changed nothing beyond what it was asked', async () => {
    expect(await run([shippingBlocked])).toBeUndefined();
  });
});
