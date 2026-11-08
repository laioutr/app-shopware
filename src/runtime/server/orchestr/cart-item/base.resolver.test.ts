import { describe, expect, it, vi } from 'vitest';
import cartItemResolver from './base.resolver';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({ cartFragmentToken: 'cart' }));
vi.mock('../../shopware-helper/getCart', () => ({ getCart: vi.fn() }));

type Resolve = {
  resolve: (args: Record<string, unknown>) => Promise<{ entities: { id: string; messages: () => unknown }[] }>;
};

describe('the cart item messages component', () => {
  it('carries the messages about that line', async () => {
    const store = new Map<string, unknown>([
      [
        'cart',
        {
          token: 'cart-token',
          lineItems: [
            { id: 'line-1', referencedId: 'product-1', type: 'product', quantity: 4 },
            { id: 'line-2', referencedId: 'product-2', type: 'product', quantity: 1 },
          ],
          errors: [
            { key: 'product-stock-reachedproduct-1', messageKey: 'product-stock-reached', level: 20, message: 'Only 2 left', block: true },
            { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true },
          ],
        },
      ],
    ]);

    const { entities } = await (cartItemResolver as unknown as Resolve).resolve({
      entityIds: ['line-1', 'line-2'],
      context: { currency: 'EUR' },
      passthrough: { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) },
      $entity: (entity: unknown) => entity,
    });

    expect(entities.map((entity) => [entity.id, entity.messages()])).toEqual([
      ['line-1', { messages: [{ code: 'not-enough-stock', level: 'error', message: 'Only 2 left', blocksCheckout: true }] }],
      ['line-2', { messages: [] }],
    ]);
  });
});
