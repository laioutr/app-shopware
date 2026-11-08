// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addedProductsOutcome, cartMessagesOf, discountCodeOutcome, lineMessagesOf, mutationMessages, toCartMessages } from './cartErrors';

describe('toCartMessages', () => {
  it('maps a Shopware 6.6+ error to a canonical message, without its parameters', () => {
    expect(
      toCartMessages({
        'product-stock-reachedabc': {
          key: 'product-stock-reachedabc',
          messageKey: 'product-stock-reached',
          level: 10,
          message: 'The product Chair is only available 2 times',
          parameters: { name: 'Chair', quantity: 2 },
          block: true,
          id: 'abc',
          quantity: 2,
        },
      } as never)
    ).toEqual([
      { code: 'quantity-adjusted', level: 'warning', message: 'The product Chair is only available 2 times', blocksCheckout: true },
    ]);
  });

  it('maps product-stock-reached by its level', () => {
    const codes = toCartMessages([
      { key: 'product-stock-reacheda', messageKey: 'product-stock-reached', level: 10 },
      { key: 'product-stock-reachedb', messageKey: 'product-stock-reached', level: 20 },
    ] as never).map((message) => message.code);

    expect(codes).toEqual(['quantity-adjusted', 'not-enough-stock']);
  });

  it.each([
    ['product-out-of-stock', 20, 'sold-out'],
    ['product-not-found', 20, 'not-found'],
    ['min-order-quantity', 10, 'below-minimum-quantity'],
    ['purchase-steps-quantity', 10, 'invalid-quantity-increment'],
    ['promotion-not-eligible', 0, 'discount-not-applicable'],
    ['promotion-not-eligible-cart-value', 0, 'discount-not-applicable'],
    ['promotion-excluded', 0, 'discount-not-applicable'],
    ['promotion-not-found', 20, 'discount-not-found'],
    ['shipping-method-blocked', 10, 'shipping-method-unavailable'],
    ['payment-method-blocked', 10, 'payment-method-unavailable'],
    ['auto-promotion-not-found', 20, 'auto-promotion-not-found'],
    ['some-plugin-error', 20, 'some-plugin-error'],
  ])('maps the message key %s at level %i to %s', (messageKey, level, code) => {
    expect(toCartMessages([{ key: messageKey, messageKey, level }] as never)[0]?.code).toBe(code);
  });

  it('maps the levels to info, warning and error', () => {
    const levels = toCartMessages([
      { messageKey: 'a', level: 0 },
      { messageKey: 'b', level: 10 },
      { messageKey: 'c', level: 20 },
    ] as never).map((message) => message.level);

    expect(levels).toEqual(['info', 'warning', 'error']);
  });

  it('takes the block flag from Shopware where it sends one, and from the level where it does not (6.5)', () => {
    const blocks = toCartMessages([
      { messageKey: 'promotion-not-found', level: 20, block: false },
      { messageKey: 'min-order-quantity', level: 10, block: true },
      { messageKey: 'product-out-of-stock', level: 20 },
      { messageKey: 'shipping-method-blocked', level: 10 },
    ] as never).map((message) => message.blocksCheckout);

    expect(blocks).toEqual([false, true, true, false]);
  });

  it('normalizes the keyed-object form and passes on nothing for no errors', () => {
    expect(toCartMessages({ 'some-id': { code: 0, key: 'x', level: 0, message: 'note', messageKey: 'x' } } as never)).toHaveLength(1);
    expect(toCartMessages(undefined)).toEqual([]);
  });
});

describe('cart and line messages', () => {
  const cart = {
    lineItems: [
      { id: 'line-1', referencedId: 'product-1', type: 'product' },
      { id: 'product-2', referencedId: 'product-2', type: 'product' },
      { id: 'promotion-line', referencedId: '', type: 'promotion' },
      { id: 'custom-line', referencedId: 'custom-1', type: 'custom' },
    ],
    errors: {
      'product-stock-reachedproduct-1': {
        key: 'product-stock-reachedproduct-1',
        messageKey: 'product-stock-reached',
        level: 20,
        message: 'stock',
      },
      'purchase-steps-quantityproduct-2': { key: 'purchase-steps-quantityproduct-2', messageKey: 'purchase-steps-quantity', level: 10 },
      'promotion-not-found': { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20 },
      'shipping-method-blocked-Standard': { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10 },
      'min-order-quantitycustom-1': { key: 'min-order-quantitycustom-1', messageKey: 'min-order-quantity', level: 10 },
    },
  } as never;

  it("puts an error on the line whose product Shopware's key names", () => {
    expect(lineMessagesOf(cart, 'line-1').map((message) => message.code)).toEqual(['not-enough-stock']);
    expect(lineMessagesOf(cart, 'product-2').map((message) => message.code)).toEqual(['invalid-quantity-increment']);
  });

  it('puts no promotion error on a promotion line', () => {
    expect(lineMessagesOf(cart, 'promotion-line')).toEqual([]);
  });

  it('keeps on the cart what is about no line it exposes', () => {
    expect(cartMessagesOf(cart).map((message) => message.code)).toEqual([
      'discount-not-found',
      'shipping-method-unavailable',
      'below-minimum-quantity',
    ]);
  });
});

describe('addedProductsOutcome', () => {
  const products = [
    { productId: 'parent-1', variantId: 'variant-1', quantity: 2 },
    { productId: 'parent-2', variantId: 'variant-2', quantity: 5 },
    { productId: 'parent-3', variantId: 'variant-3', quantity: 1 },
  ];

  const { items, messages } = addedProductsOutcome(products, [
    {
      key: 'product-out-of-stockvariant-1',
      messageKey: 'product-out-of-stock',
      level: 20,
      message: 'The product Chair is no longer available',
    },
    { key: 'product-stock-reachedvariant-2', messageKey: 'product-stock-reached', level: 10, message: 'Only 3 left', block: true },
    { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true },
  ]);

  it('rejects a product whose line carries an error, with its code and message', () => {
    expect(items[0]).toEqual({
      status: 'rejected',
      productId: 'parent-1',
      variantId: 'variant-1',
      reason: 'sold-out',
      reasonLabel: 'The product Chair is no longer available',
    });
  });

  it('keeps a product added whose line only carries a warning', () => {
    expect(items.slice(1)).toEqual([
      { status: 'added', productId: 'parent-2', variantId: 'variant-2', quantity: 5 },
      { status: 'added', productId: 'parent-3', variantId: 'variant-3', quantity: 1 },
    ]);
  });

  it('answers every message but the rejection', () => {
    expect(messages.map((message) => message.code)).toEqual(['quantity-adjusted', 'shipping-method-unavailable']);
  });
});

describe('discountCodeOutcome', () => {
  const promotionLine = { id: 'promotion-1', type: 'promotion', referencedId: 'SUMMER' };

  it('reports an applied code as added and answers the other errors', () => {
    const { item, messages } = discountCodeOutcome('SUMMER', {
      lineItems: [promotionLine],
      errors: [{ key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' }],
    } as never);

    expect(item).toEqual({ status: 'added', quantity: 1 });
    expect(messages.map((message) => message.code)).toEqual(['discount-not-applicable']);
  });

  it('reports an unknown code as not-found and does not answer its error again', () => {
    const { item, messages } = discountCodeOutcome('NOPE', {
      lineItems: [],
      errors: [
        { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20, message: 'Promotion with code NOPE not found!' },
      ],
    } as never);

    expect(item).toEqual({ status: 'rejected', reason: 'not-found', reasonLabel: 'Promotion with code NOPE not found!' });
    expect(messages).toEqual([]);
  });

  it.each([['promotion-not-eligible'], ['promotion-not-eligible-cart-value'], ['promotion-excluded']])(
    'reports a code refused as %s as discount-not-applicable, labelled with Shopware’s message',
    (messageKey) => {
      const { item, messages } = discountCodeOutcome('SUMMER', {
        lineItems: [],
        errors: [{ key: messageKey, messageKey, level: 0, message: 'Promotion Summer not eligible for cart!' }],
      } as never);

      expect(item).toEqual({
        status: 'rejected',
        reason: 'discount-not-applicable',
        reasonLabel: 'Promotion Summer not eligible for cart!',
      });
      expect(messages).toEqual([]);
    }
  );

  it('takes an unknown code over an earlier code that no longer applies', () => {
    const { item, messages } = discountCodeOutcome('NOPE', {
      lineItems: [],
      errors: [
        { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
        { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20, message: 'NOPE not found' },
      ],
    } as never);

    expect(item).toMatchObject({ status: 'rejected', reason: 'not-found' });
    expect(messages.map((message) => message.message)).toEqual(['WINTER not eligible']);
  });

  it('leaves a lapsed automatic promotion a cart message, not the code’s refusal', () => {
    const { item, messages } = discountCodeOutcome('NOPE', {
      lineItems: [],
      errors: [{ key: 'auto-promotion-not-found-Spring', messageKey: 'auto-promotion-not-found', level: 20, message: 'gone' }],
    } as never);

    expect(item).toEqual({ status: 'rejected', reason: 'not-found' });
    expect(messages).toEqual([{ code: 'auto-promotion-not-found', level: 'error', message: 'gone', blocksCheckout: true }]);
  });
});

describe('mutationMessages', () => {
  it('answers nothing when Shopware reported nothing', () => {
    expect(mutationMessages([])).toBeUndefined();
  });

  it('answers a message several requests reported once', () => {
    const blocked = { code: 'shipping-method-unavailable', level: 'warning', blocksCheckout: true } as const;
    const adjusted = { code: 'quantity-adjusted', level: 'warning', message: 'Only 3 left', blocksCheckout: true } as const;

    expect(mutationMessages([blocked, adjusted, { ...blocked }])).toEqual({ messages: [blocked, adjusted] });
  });
});
