import { describe, expect, it, vi } from 'vitest';
import cartResolver from './base.resolver';
import type { CustomFieldsConfig } from '../../types/customFields';

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ '@laioutr/app-shopware': {} }) }));
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({ cartFragmentToken: 'cart' }));
vi.mock('../../shopware-helper/getCart', () => ({ getCart: vi.fn() }));

type Resolve = {
  resolve: (args: Record<string, unknown>) => Promise<{ entities: { base: () => unknown; messages: () => unknown }[] }>;
};

const resolveCart = async (cart: unknown, customFields?: CustomFieldsConfig) => {
  const store = new Map<string, unknown>([['cart', cart]]);
  const result = await (cartResolver as unknown as Resolve).resolve({
    context: { currency: 'EUR', customFields },
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

describe('the cart base component', () => {
  // As GET /store-api/checkout/cart answers it with a minimum-order-value plugin installed.
  const cartWithExtensions = {
    token: 'cart-token',
    lineItems: [{ id: 'product-1', referencedId: 'product-1', type: 'product', quantity: 2 }],
    errors: [],
    extensions: {
      minimumOrderValueDifference: { apiAlias: 'array_struct', difference: -28.89 },
      internalPricing: { apiAlias: 'array_struct', margin: 0.42 },
    },
  };

  it('carries the cart extensions the cart whitelist names, without their apiAlias', async () => {
    const cart = await resolveCart(cartWithExtensions, { cart: { include: ['minimumOrderValueDifference'] } });

    expect(cart.base()).toEqual({
      totalQuantity: 2,
      customFields: { minimumOrderValueDifference: { difference: -28.89 } },
    });
  });

  it('carries no extension while the cart whitelist is empty', async () => {
    const cart = await resolveCart(cartWithExtensions, { product: { include: ['*'] } });

    expect((cart.base() as { customFields?: unknown }).customFields).toBeUndefined();
  });
});
