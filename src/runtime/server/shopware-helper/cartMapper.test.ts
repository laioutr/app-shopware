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
