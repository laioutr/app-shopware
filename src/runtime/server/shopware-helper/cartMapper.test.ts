// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapCartCost, mapCartItem } from './cartMapper';

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

  // Shopware sends clean 2-decimal amounts, but summing them in JS floats does not stay
  // 2-decimal: 7.43 + 0.39 === 7.819999999999999. `Money.fromDecimal` rejects anything with
  // more decimals than the currency allows, so these carts used to throw
  // "The currency EUR supports only 2 decimal digits" instead of mapping.
  it('sums item tax and shipping tax without float drift', () => {
    const cart = {
      ...grossCart,
      deliveries: [{ shippingCosts: { totalPrice: 5.9, calculatedTaxes: [{ price: 5.9, tax: 0.39, taxRate: 7 }] } }],
      price: { ...grossCart.price, positionPrice: 107.82, totalPrice: 113.72, calculatedTaxes: [{ price: 107.82, tax: 7.43, taxRate: 7 }] },
    };

    expect(mapCartCost(cart as never, 'EUR').tax?.total).toMatchObject({ amount: 782, currency: 'EUR' }); // 7.43 + 0.39
  });

  it('sums several tax rates without float drift', () => {
    const cart = {
      ...grossCart,
      deliveries: [],
      price: {
        ...grossCart.price,
        calculatedTaxes: [
          { price: 2.71, tax: 0.19, taxRate: 7 },
          { price: 2, tax: 0.38, taxRate: 19 },
        ],
      },
    };

    expect(mapCartCost(cart as never, 'EUR').tax?.total).toMatchObject({ amount: 57, currency: 'EUR' }); // 0.19 + 0.38
  });

  it('sums the line-item subtotal fallback without float drift', () => {
    const cart = {
      ...grossCart,
      lineItems: [
        { id: 'li1', type: 'product', quantity: 1, price: { totalPrice: 0.19 } },
        { id: 'li2', type: 'product', quantity: 1, price: { totalPrice: 0.38 } },
      ],
      price: { ...grossCart.price, positionPrice: undefined, totalPrice: undefined, calculatedTaxes: [] },
    };

    expect(mapCartCost(cart as never, 'EUR').subtotal).toMatchObject({ amount: 57, currency: 'EUR' }); // 0.19 + 0.38
  });
});

const shirtLine = {
  id: 'li1',
  type: 'product',
  label: 'Cool Shirt',
  quantity: 2,
  referencedId: 'v1',
  payload: {
    parentId: 'p1',
    productNumber: 'SKU-1',
    availableStock: 5,
    available: true,
    seoUrls: [{ seoPathInfo: 'cool-shirt', isCanonical: true }],
  },
  price: { unitPrice: 10, totalPrice: 20, listPrice: { price: 12 }, quantity: 2, calculatedTaxes: [] },
  quantityInformation: { minPurchase: 1, maxPurchase: 5, purchaseSteps: 1 },
  cover: { media: { mimeType: 'image/jpeg', url: 'http://localhost:8000/a.jpg', metaData: { width: 100, height: 100 }, thumbnails: [] } },
};

describe('mapCartItem', () => {
  it('maps a product line item to canonical CartItem components', () => {
    const item = mapCartItem(shirtLine as never, 'EUR');

    expect(item.base).toMatchObject({ type: 'product', quantity: 2, title: 'Cool Shirt', code: 'SKU-1' });
    expect(item.base.link).toMatchObject({ type: 'reference', reference: { type: 'Product', id: 'p1', slug: 'cool-shirt' } });
    expect(item.base.cover?.type).toBe('image');
    expect(item.cost.single).toMatchObject({ amount: 1000, currency: 'EUR' });
    expect(item.cost.subtotal).toMatchObject({ amount: 2000, currency: 'EUR' });
    expect(item.cost.total).toMatchObject({ amount: 2000, currency: 'EUR' });
    expect(item.cost.singleStrikethrough).toMatchObject({ amount: 1200, currency: 'EUR' });
    expect(item.availability).toMatchObject({ quantity: 5, status: 'inStock' });
    expect(item.quantityRule).toEqual({ min: 1, max: 5, increment: 1, canChange: true });
  });

  it('omits strikethrough when the list price is not above the unit price', () => {
    const line = { ...shirtLine, price: { ...shirtLine.price, listPrice: { price: 8 } } };
    expect(mapCartItem(line as never, 'EUR').cost.singleStrikethrough).toBeUndefined();
  });

  it('reports outOfStock when available stock is 0', () => {
    const line = { ...shirtLine, payload: { ...shirtLine.payload, availableStock: 0 } };
    expect(mapCartItem(line as never, 'EUR').availability.status).toBe('outOfStock');
  });

  it('falls back to a sluggified label when the payload has no seoUrls', () => {
    const line = { ...shirtLine, payload: { ...shirtLine.payload, seoUrls: undefined } };
    expect(mapCartItem(line as never, 'EUR').base.link).toMatchObject({
      reference: { slug: 'cool-shirt-v1' },
    });
  });
});
