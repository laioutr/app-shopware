import { describe, expect, it, vi } from 'vitest';
import addItemsAction from './add-item.action';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, handler: unknown) => handler }));
vi.mock('../../shopware-helper/persistContextToken', () => ({ persistContextToken: vi.fn() }));

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

const shippingBlocked = { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true };

describe('CartAddItemsAction', () => {
  it('answers each item in input order, and what Shopware reported beyond them once', async () => {
    const invoke = vi.fn(async (_operation: string, { body }: { body: { items: { type: string }[] } }) => {
      if (body.items[0]?.type === 'promotion') {
        return {
          data: {
            token: 't',
            lineItems: [],
            errors: [
              shippingBlocked,
              { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
              { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20 },
            ],
          },
        };
      }
      return {
        data: {
          token: 't',
          lineItems: [],
          errors: [
            shippingBlocked,
            { key: 'product-out-of-stockvariant-1', messageKey: 'product-out-of-stock', level: 20, message: 'gone' },
          ],
        },
      };
    });

    const result = await (addItemsAction as unknown as Handler)({
      event: {},
      context: { storefrontClient: { invoke } },
      input: [
        { type: 'product', productId: 'parent-1', variantId: 'variant-1', quantity: 1 },
        { type: 'discount-code', code: 'NOPE' },
        { type: 'product', productId: 'parent-2', variantId: 'variant-2', quantity: 2 },
      ],
    });

    expect(result).toEqual({
      items: [
        { status: 'rejected', productId: 'parent-1', variantId: 'variant-1', reason: 'sold-out', reasonLabel: 'gone' },
        { status: 'rejected', reason: 'not-found' },
        { status: 'added', productId: 'parent-2', variantId: 'variant-2', quantity: 2 },
      ],
      messages: [
        { code: 'shipping-method-unavailable', level: 'warning', blocksCheckout: true },
        { code: 'discount-not-applicable', level: 'info', message: 'WINTER not eligible', blocksCheckout: false },
      ],
    });
  });
});
