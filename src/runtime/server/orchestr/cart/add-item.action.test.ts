import { describe, expect, it, vi } from 'vitest';
import addItemsAction from './add-item.action';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, handler: unknown) => handler }));
vi.mock('../../shopware-helper/persistContextToken', () => ({ persistContextToken: vi.fn() }));

type Handler = (args: Record<string, unknown>) => Promise<unknown>;
type Body = { body: { items: { type: string; referencedId?: string }[] } };

const shippingBlocked = { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true };
const pluginNotice = { key: 'some-plugin-notice', messageKey: 'some-plugin-notice', level: 0, message: 'note' };

const run = (invoke: (operation: string, body: Body) => Promise<unknown>, input: unknown[]) =>
  (addItemsAction as unknown as Handler)({ event: {}, context: { storefrontClient: { invoke: vi.fn(invoke) } }, input });

describe('CartAddItemsAction', () => {
  it('answers each item in input order, and what Shopware reported beyond them once', async () => {
    const result = await run(
      async (_operation, { body }) => {
        if (body.items[0]?.type === 'promotion') {
          return {
            data: {
              token: 't',
              lineItems: [],
              errors: [
                shippingBlocked,
                pluginNotice,
                { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
                { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20 },
              ],
            },
          };
        }
        return {
          data: {
            token: 't',
            lineItems: [{ id: 'variant-2', referencedId: 'variant-2', type: 'product', quantity: 2 }],
            errors: [
              shippingBlocked,
              pluginNotice,
              { key: 'product-out-of-stockvariant-1', messageKey: 'product-out-of-stock', level: 20, message: 'gone' },
            ],
          },
        };
      },
      [
        { type: 'product', productId: 'parent-1', variantId: 'variant-1', quantity: 1 },
        { type: 'discount-code', code: 'NOPE' },
        { type: 'product', productId: 'parent-2', variantId: 'variant-2', quantity: 2 },
      ]
    );

    expect(result).toEqual({
      items: [
        { status: 'rejected', productId: 'parent-1', variantId: 'variant-1', reason: 'sold-out', reasonLabel: 'gone' },
        { status: 'rejected', reason: 'not-found' },
        { status: 'added', productId: 'parent-2', variantId: 'variant-2', quantity: 2 },
      ],
      messages: [{ code: 'some-plugin-notice', level: 'info', message: 'note', blocksCheckout: false }],
    });
  });

  it("does not answer a code's refusal that Shopware raises again for the next code", async () => {
    const winterBlocked = { key: 'custom-promotion-blocked', messageKey: 'custom-promotion-blocked', level: 10, message: 'WINTER blocked' };

    const result = await run(
      async (_operation, { body }) => {
        if (body.items[0]?.referencedId === 'WINTER') return { data: { token: 't', lineItems: [], errors: [winterBlocked] } };
        return {
          data: {
            token: 't',
            lineItems: [{ id: 'promotion-1', type: 'promotion', referencedId: 'SUMMER' }],
            errors: [
              winterBlocked,
              { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
              { key: 'promotion-discount-added', messageKey: 'promotion-discount-added', level: 0, message: 'Summer added' },
            ],
          },
        };
      },
      [
        { type: 'discount-code', code: 'WINTER' },
        { type: 'discount-code', code: 'SUMMER' },
      ]
    );

    expect(result).toEqual({
      items: [
        { status: 'rejected', reason: 'discount-not-applicable', reasonLabel: 'WINTER blocked' },
        { status: 'added', quantity: 1 },
      ],
      messages: [{ code: 'promotion-discount-added', level: 'info', message: 'Summer added', blocksCheckout: false }],
    });
  });
});
