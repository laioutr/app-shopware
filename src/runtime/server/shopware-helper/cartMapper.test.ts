// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapCartCost } from './cartMapper';

// A minimal Shopware cart: 1 line (net 100.00, gross 119.00, 19% tax) + 5.00 shipping (1.00 tax).
const grossCart = {
  token: 'ctx-1',
  lineItems: [{ id: 'li1', type: 'product', quantity: 1, price: { totalPrice: 119 } }],
  deliveries: [{ shippingCosts: { totalPrice: 5, calculatedTaxes: [{ price: 5, tax: 1, taxRate: 19 }] } }],
  price: {
    positionPrice: 100,
    totalPrice: 119,
    netPrice: 100,
    taxStatus: 'gross',
    calculatedTaxes: [{ price: 100, tax: 19, taxRate: 19 }],
  },
};

describe('mapCartCost', () => {
  it('maps the nested cost from a gross cart', () => {
    const cost = mapCartCost(grossCart as never, 'EUR');

    expect(cost.subtotal).toMatchObject({ amount: 10000, currency: 'EUR' });
    expect(cost.subtotalIsEstimated).toBe(false);
    expect(cost.total).toMatchObject({ amount: 11900, currency: 'EUR' });
    expect(cost.totalIsEstimated).toBe(false);
    expect(cost.shipping?.total).toMatchObject({ amount: 500, currency: 'EUR' });
    expect(cost.tax?.total).toMatchObject({ amount: 2000, currency: 'EUR' }); // 19.00 + 1.00
    expect(cost.tax?.isIncluded).toBe(true); // gross ⇒ tax included
    expect(cost.taxes).toHaveLength(1);
    expect(cost.taxes?.[0]).toMatchObject({ rate: 0.19, amount: { amount: 1900, currency: 'EUR' } });
  });

  it('marks tax as not included for a net cart', () => {
    const netCart = { ...grossCart, price: { ...grossCart.price, taxStatus: 'net' } };
    expect(mapCartCost(netCart as never, 'EUR').tax?.isIncluded).toBe(false);
  });

  it('omits shipping when there are no deliveries', () => {
    const noShip = { ...grossCart, deliveries: [] };
    expect(mapCartCost(noShip as never, 'EUR').shipping).toBeUndefined();
  });
});
