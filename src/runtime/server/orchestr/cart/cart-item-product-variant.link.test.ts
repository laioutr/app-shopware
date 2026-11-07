import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartItemProductVariant from './cart-item-product-variant.link';
import { getCart } from '../../shopware-helper/getCart';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareLink: (_token: unknown, run: unknown) => run }));
vi.mock('../../const/passthroughTokens', () => ({ cartFragmentToken: 'cart' }));
vi.mock('../../shopware-helper/getCart', () => ({ getCart: vi.fn() }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const passthroughOf = (entries: Record<string, unknown> = {}) => {
  const store = new Map(Object.entries(entries));
  return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => store.set(key, value) };
};

const cart = {
  token: 'cart-token',
  lineItems: [
    { id: 'li-variant', type: 'product', referencedId: 'variant-1' },
    { id: 'li-simple', type: 'product', referencedId: 'product-2' },
    { id: 'li-promo', type: 'promotion', referencedId: 'SUMMER' },
  ],
};

const context = { storefrontClient: {} };

beforeEach(() => {
  vi.mocked(getCart).mockReset();
});

describe('CartItemProductVariantLink', () => {
  it("links product line items to the product row they reference, from the request's cart", async () => {
    const result = await (cartItemProductVariant as unknown as Run)({
      entityIds: ['li-variant', 'li-simple', 'li-promo', 'li-gone'],
      context,
      passthrough: passthroughOf({ cart }),
    });

    expect(result).toEqual({
      links: [
        { sourceId: 'li-variant', targetId: 'variant-1' },
        { sourceId: 'li-simple', targetId: 'product-2' },
      ],
    });
    expect(getCart).not.toHaveBeenCalled();
  });

  it('reads the cart when the request has not', async () => {
    vi.mocked(getCart).mockResolvedValue(cart as never);
    const passthrough = passthroughOf();

    await (cartItemProductVariant as unknown as Run)({ entityIds: ['li-variant'], context, passthrough });

    expect(getCart).toHaveBeenCalledTimes(1);
    expect(passthrough.get('cart')).toBe(cart);
  });
});
