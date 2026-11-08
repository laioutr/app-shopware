import { describe, expect, it, vi } from 'vitest';
import cartResolver from './base.resolver';

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ '@laioutr/app-shopware': {} }) }));
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({ cartFragmentToken: 'cart' }));
vi.mock('../../shopware-helper/getCart', () => ({ getCart: vi.fn() }));

type Resolve = {
  resolve: (args: Record<string, unknown>) => Promise<{ entities: { messages: () => unknown }[] }>;
};

const resolveCart = async (cart: unknown) => {
  const store = new Map<string, unknown>([['cart', cart]]);
  const result = await (cartResolver as unknown as Resolve).resolve({
    context: { currency: 'EUR' },
    passthrough: { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) },
    $entity: (entity: unknown) => entity,
  });
  return result.entities[0]!;
};

describe('the cart messages component', () => {
  it("carries the cart's messages that are not about one of its lines", async () => {
    const cart = await resolveCart({
      token: 'cart-token',
      lineItems: [{ id: 'product-1', referencedId: 'product-1', type: 'product', quantity: 1 }],
      errors: {
        'shipping-method-blocked-Standard': {
          key: 'shipping-method-blocked-Standard',
          messageKey: 'shipping-method-blocked',
          level: 10,
          message: 'Shipping method Standard not available',
          parameters: { name: 'Standard' },
          block: true,
        },
        'product-stock-reachedproduct-1': {
          key: 'product-stock-reachedproduct-1',
          messageKey: 'product-stock-reached',
          level: 20,
          message: 'The product Chair is only available 2 times',
          block: true,
        },
      },
    });

    expect(cart.messages()).toEqual({
      messages: [
        { code: 'shipping-method-unavailable', level: 'warning', message: 'Shipping method Standard not available', blocksCheckout: true },
      ],
    });
  });

  it('is empty for a cart without errors', async () => {
    expect((await resolveCart({ token: 'cart-token', lineItems: [], errors: [] })).messages()).toEqual({ messages: [] });
  });
});
