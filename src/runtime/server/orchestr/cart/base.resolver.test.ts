import { describe, expect, it, vi } from 'vitest';
import cartResolver from './base.resolver';

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ '@laioutr/app-shopware': {} }) }));
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({ cartFragmentToken: 'cart' }));
vi.mock('../../shopware-helper/getCart', () => ({ getCart: vi.fn() }));

type Resolve = { resolve: (args: Record<string, unknown>) => Promise<{ entities: { base: () => unknown }[] }> };

const resolveBase = async (cart: unknown) => {
  const store = new Map<string, unknown>([['cart', cart]]);
  const result = await (cartResolver as unknown as Resolve).resolve({
    context: { currency: 'EUR' },
    passthrough: { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) },
    $entity: (entity: unknown) => entity,
  });
  return result.entities[0]!.base();
};

describe('the cart base component', () => {
  it("exposes the cart's errors for the storefront to translate", async () => {
    const base = await resolveBase({
      token: 'cart-token',
      lineItems: [],
      errors: {
        'shipping-method-blockedStandard': {
          key: 'shipping-method-blockedStandard',
          messageKey: 'shipping-method-blocked',
          level: 10,
          message: 'Shipping method Standard not available',
          parameters: { name: 'Standard' },
          block: false,
        },
      },
    });

    expect(base).toMatchObject({
      customFields: {
        cartErrors: [
          {
            key: 'shipping-method-blocked',
            id: 'shipping-method-blockedStandard',
            level: 'warning',
            parameters: { name: 'Standard' },
            blocksOrder: false,
          },
        ],
      },
    });
  });

  it('leaves customFields out of a cart without errors', async () => {
    expect(await resolveBase({ token: 'cart-token', lineItems: [], errors: [] })).not.toHaveProperty('customFields');
  });
});
