import { beforeEach, describe, expect, it, vi } from 'vitest';
import productResolver from './base.resolver';
import { fetchAllProducts } from '../../shopware-helper/fetchAllProductVariants';

// The resolver reaches Nuxt's auto-imports through these modules, which a plain node run cannot resolve.
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareComponentResolver: (resolver: unknown) => resolver }));
vi.mock('../../const/passthroughTokens', () => ({
  parentIdToDefaultVariantIdToken: 'parentIdToDefaultVariantId',
  productVariantsToken: 'productVariants',
}));
vi.mock('../../shopware-helper/fetchAllProductVariants', () => ({ fetchAllProducts: vi.fn() }));

type Prices = { price: unknown; lowestPriorPrice?: unknown };
type Resolved = { entities: { prices: () => Prices }[] };

const context = {
  storefrontClient: { invoke: vi.fn() },
  settings: { maxLimit: 100 },
  resolveCriteria: async (_entity: string, criteria: unknown) => criteria,
  currency: 'EUR',
};

const pricesOf = async (product: Record<string, unknown>, defaultVariant?: Record<string, unknown>) => {
  const rows: Record<string, unknown>[] = [{ id: 'p1', translated: { name: 'Sofa' }, ...product }];
  if (defaultVariant) rows.push({ id: 'v1', parentId: 'p1', translated: { name: 'Sofa, grey' }, ...defaultVariant });
  vi.mocked(fetchAllProducts).mockResolvedValue(rows as never);
  const passthrough = new Map<string, unknown>(defaultVariant ? [['parentIdToDefaultVariantId', { p1: 'v1' }]] : []);
  const result = (await (productResolver as unknown as { resolve: (args: unknown) => Promise<Resolved> }).resolve({
    entityIds: ['p1'],
    requestedComponents: ['prices'],
    context,
    passthrough: { get: (key: string) => passthrough.get(key), set: () => {} },
    $entity: (entity: unknown) => entity,
  })) as Resolved;
  return result.entities[0]!.prices();
};

beforeEach(() => {
  vi.mocked(fetchAllProducts).mockReset();
});

describe('the lowest prior price of a product', () => {
  it('is the prior price of the cheapest variant, which sets the price', async () => {
    const prices = await pricesOf({
      calculatedCheapestPrice: { totalPrice: 80, listPrice: { price: 100 }, regulationPrice: { price: 85 }, hasRange: true },
      calculatedPrice: { totalPrice: 120, regulationPrice: { price: 110 } },
    });

    expect(prices.price).toMatchObject({ amount: 8000, currency: 'EUR' });
    expect(prices.lowestPriorPrice).toMatchObject({ amount: 8500, currency: 'EUR' });
  });

  it('is read from the product price where Shopware reports no cheapest variant', async () => {
    const prices = await pricesOf({ calculatedPrice: { totalPrice: 50, regulationPrice: { price: 55 } } });

    expect(prices.lowestPriorPrice).toMatchObject({ amount: 5500, currency: 'EUR' });
  });

  it("is the product's, not the one of the variant a listing shows", async () => {
    const prices = await pricesOf(
      { calculatedCheapestPrice: { totalPrice: 80, regulationPrice: { price: 85 } }, calculatedPrice: { totalPrice: 120 } },
      {
        calculatedCheapestPrice: { totalPrice: 90, regulationPrice: { price: 99 } },
        calculatedPrice: { totalPrice: 90, regulationPrice: { price: 99 } },
      }
    );

    expect(prices.lowestPriorPrice).toMatchObject({ amount: 8500, currency: 'EUR' });
  });

  it('stays unset when the cheapest variant has none, rather than taking another price', async () => {
    const prices = await pricesOf({
      calculatedCheapestPrice: { totalPrice: 80, regulationPrice: null },
      calculatedPrice: { totalPrice: 120, regulationPrice: { price: 110 } },
    });

    expect(prices.lowestPriorPrice).toBeUndefined();
  });
});
