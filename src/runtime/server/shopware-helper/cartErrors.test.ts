// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addedProductsOutcome,
  cartMessagesOf,
  discountCodeOutcome,
  messagesByLineOf,
  mutationMessages,
  writeMessagesOf,
} from './cartErrors';

// A cart without lines carries every error as a cart message.
const messagesOf = (errors: unknown) => cartMessagesOf({ errors } as never);

describe('the canonical message of a Shopware cart error', () => {
  it('maps a Shopware 6.6.7+ error to a canonical message', () => {
    expect(
      messagesOf({
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
      })
    ).toEqual([
      { code: 'quantity-adjusted', level: 'warning', message: 'The product Chair is only available 2 times', blocksCheckout: true },
    ]);
  });

  it('maps product-stock-reached by its level', () => {
    const codes = messagesOf([
      { key: 'product-stock-reacheda', messageKey: 'product-stock-reached', level: 10 },
      { key: 'product-stock-reachedb', messageKey: 'product-stock-reached', level: 20 },
    ]).map((message) => message.code);

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
    expect(messagesOf([{ key: messageKey, messageKey, level }])[0]?.code).toBe(code);
  });

  it('maps the levels to info, warning and error', () => {
    const levels = messagesOf([
      { messageKey: 'a', level: 0 },
      { messageKey: 'b', level: 10 },
      { messageKey: 'c', level: 20 },
    ]).map((message) => message.level);

    expect(levels).toEqual(['info', 'warning', 'error']);
  });

  it('takes the block flag from Shopware where it sends one', () => {
    const blocks = messagesOf([
      { messageKey: 'promotion-not-found', level: 20, block: true },
      { messageKey: 'min-order-quantity', level: 10, block: false },
    ]).map((message) => message.blocksCheckout);

    expect(blocks).toEqual([true, false]);
  });

  it("takes the block flag from the error's class where Shopware sends none (6.5 to 6.6.6), and from the level for a key it does not know", () => {
    const blocks = messagesOf([
      { messageKey: 'shipping-method-blocked', level: 10 },
      { messageKey: 'payment-method-blocked', level: 10 },
      { messageKey: 'min-order-quantity', level: 10 },
      { messageKey: 'purchase-steps-quantity', level: 10 },
      { messageKey: 'salutation-missing-billing-address', level: 10 },
      { messageKey: 'promotion-not-found', level: 20 },
      { messageKey: 'product-out-of-stock', level: 20 },
      { messageKey: 'some-plugin-error', level: 20 },
      { messageKey: 'some-plugin-warning', level: 10 },
    ]).map((message) => message.blocksCheckout);

    expect(blocks).toEqual([true, true, true, true, true, false, true, true, false]);
  });

  it("prefers Shopware's translated message, in the request's language", () => {
    const [message] = messagesOf([
      {
        messageKey: 'product-out-of-stock',
        level: 20,
        message: 'The product Chair is not available any more',
        translatedMessage: 'Das Produkt "Stuhl" ist nicht mehr verfügbar',
      },
    ]);

    expect(message?.message).toBe('Das Produkt "Stuhl" ist nicht mehr verfügbar');
  });

  it('falls back to the message when the translation is the missing snippet’s id or empty', () => {
    const texts = messagesOf([
      { messageKey: 'some-plugin-error', level: 20, message: 'Plugin text', translatedMessage: 'checkout.some-plugin-error' },
      { messageKey: 'some-plugin-error', level: 20, message: 'Plugin text', translatedMessage: '' },
      { messageKey: 'some-plugin-error', level: 20, message: 'Plugin text', translatedMessage: null },
    ]).map((message) => message.message);

    expect(texts).toEqual(['Plugin text', 'Plugin text', 'Plugin text']);
  });

  it('leaves out a text that still holds an unfilled placeholder', () => {
    expect(messagesOf([{ messageKey: 'product-not-found', level: 20, message: 'The product %s could not be found' }])).toEqual([
      { code: 'not-found', level: 'error', blocksCheckout: true },
    ]);
  });

  it.each([
    ['an unfilled placeholder', 'Bitte unter %url% eine Anrede setzen.'],
    ['markup', 'Bitte <a href="/account">hier</a> eine Anrede setzen.'],
  ])('falls back to the message when the translation holds %s', (_, translatedMessage) => {
    const [message] = messagesOf([
      {
        messageKey: 'salutation-missing-billing-address',
        level: 10,
        message: 'A salutation is missing from your billing address.',
        translatedMessage,
      },
    ]);

    expect(message?.message).toBe('A salutation is missing from your billing address.');
  });

  it('normalizes the keyed-object form and passes on nothing for no errors', () => {
    expect(messagesOf({ 'some-id': { code: 0, key: 'x', level: 0, message: 'note', messageKey: 'x' } })).toHaveLength(1);
    expect(messagesOf(undefined)).toEqual([]);
  });
});

describe('the messages of a write', () => {
  const errors = [
    { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true },
    { key: 'payment-method-blocked-Invoice', messageKey: 'payment-method-blocked', level: 10, block: true },
    { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
    { key: 'promotion-excluded', messageKey: 'promotion-excluded', level: 0 },
    { key: 'product-stock-reachedproduct-1', messageKey: 'product-stock-reached', level: 20, message: 'Only 2 left' },
    { key: 'product-stock-reachedproduct-2', messageKey: 'product-stock-reached', level: 10, message: 'Lowered to 3' },
    { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible-already-redeemed', level: 0, message: 'SPRING redeemed' },
  ];

  it('leaves out what Shopware raises on every calculation', () => {
    expect(writeMessagesOf(errors).map((message) => message.message)).toEqual(['Lowered to 3', 'SPRING redeemed']);
  });

  it('keeps it on the cart and its lines', () => {
    const cart = { lineItems: [{ id: 'product-1', referencedId: 'product-1', type: 'product' }], errors } as never;

    expect(cartMessagesOf(cart).map((message) => message.code)).toEqual([
      'shipping-method-unavailable',
      'payment-method-unavailable',
      'discount-not-applicable',
      'discount-not-applicable',
      'quantity-adjusted',
      'discount-not-applicable',
    ]);
    expect(
      messagesByLineOf(cart)
        .get('product-1')
        ?.map((message) => message.code)
    ).toEqual(['not-enough-stock']);
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
    const byLine = messagesByLineOf(cart);

    expect(byLine.get('line-1')?.map((message) => message.code)).toEqual(['not-enough-stock']);
    expect(byLine.get('product-2')?.map((message) => message.code)).toEqual(['invalid-quantity-increment']);
  });

  it('puts no promotion error on a promotion line', () => {
    expect(messagesByLineOf(cart).get('promotion-line')).toBeUndefined();
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
  const line = (id: string, quantity: number) => ({ id, referencedId: id, type: 'product', quantity });

  it('rejects a product whose line is gone, with the code and message of the error about it', () => {
    const { items, messages } = addedProductsOutcome([{ productId: 'parent-1', variantId: 'variant-1', quantity: 2 }], {
      lineItems: [],
      errors: [
        {
          key: 'product-out-of-stockvariant-1',
          messageKey: 'product-out-of-stock',
          level: 20,
          message: 'The product Chair is no longer available',
        },
      ],
    } as never);

    expect(items).toEqual([
      {
        status: 'rejected',
        productId: 'parent-1',
        variantId: 'variant-1',
        reason: 'sold-out',
        reasonLabel: 'The product Chair is no longer available',
      },
    ]);
    expect(messages).toEqual([]);
  });

  it('rejects a product whose line is gone without an error about it as not-orderable', () => {
    const { items, messages } = addedProductsOutcome(
      [
        { productId: 'container', variantId: 'container', quantity: 1 },
        { productId: 'parent-2', variantId: 'variant-2', quantity: 1 },
      ],
      {
        lineItems: [],
        errors: [
          { key: 'product-not-foundChair', messageKey: 'product-not-found', level: 20, message: 'The product %s could not be found' },
        ],
      } as never
    );

    expect(items).toEqual([
      { status: 'rejected', productId: 'container', variantId: 'container', reason: 'not-orderable' },
      { status: 'rejected', productId: 'parent-2', variantId: 'variant-2', reason: 'not-orderable' },
    ]);
    expect(messages).toEqual([{ code: 'not-found', level: 'error', blocksCheckout: true }]);
  });

  it('adds a product whose line stays though its lines ask for more than is in stock, and leaves that to the line', () => {
    const { items, messages } = addedProductsOutcome([{ productId: 'parent-1', variantId: 'variant-1', quantity: 2 }], {
      lineItems: [line('variant-1', 2)],
      errors: [{ key: 'product-stock-reachedvariant-1', messageKey: 'product-stock-reached', level: 20, message: 'Only 1 left' }],
    } as never);

    expect(items).toEqual([{ status: 'added', productId: 'parent-1', variantId: 'variant-1', quantity: 2 }]);
    expect(messages).toEqual([]);
  });

  it('takes the quantity from the line Shopware lowered, and answers the message about it', () => {
    const { items, messages } = addedProductsOutcome([{ productId: 'parent-1', variantId: 'variant-1', quantity: 5 }], {
      lineItems: [line('variant-1', 3)],
      errors: [
        { key: 'product-stock-reachedvariant-1', messageKey: 'product-stock-reached', level: 10, message: 'Only 3 left', block: true },
      ],
    } as never);

    expect(items).toEqual([{ status: 'added', productId: 'parent-1', variantId: 'variant-1', quantity: 3 }]);
    expect(messages).toEqual([{ code: 'quantity-adjusted', level: 'warning', message: 'Only 3 left', blocksCheckout: true }]);
  });

  it('claims no more than it asked for of a line that already held the product', () => {
    const { items } = addedProductsOutcome([{ productId: 'parent-1', variantId: 'variant-1', quantity: 2 }], {
      lineItems: [line('variant-1', 6)],
      errors: [],
    } as never);

    expect(items).toEqual([{ status: 'added', productId: 'parent-1', variantId: 'variant-1', quantity: 2 }]);
  });

  it('claims no more of a line than it holds for two items of one product', () => {
    const { items } = addedProductsOutcome(
      [
        { productId: 'parent-1', variantId: 'variant-1', quantity: 3 },
        { productId: 'parent-1', variantId: 'variant-1', quantity: 3 },
      ],
      { lineItems: [line('variant-1', 4)], errors: [] } as never
    );

    expect(items.map((item) => item.status === 'added' && item.quantity)).toEqual([3, 1]);
  });

  it('refuses an item that added nothing to a line the earlier items took', () => {
    const { items } = addedProductsOutcome(
      [
        { productId: 'parent-1', variantId: 'variant-1', quantity: 3 },
        { productId: 'parent-1', variantId: 'variant-1', quantity: 3 },
      ],
      { lineItems: [line('variant-1', 3)], errors: [] } as never
    );

    expect(items).toEqual([
      { status: 'added', productId: 'parent-1', variantId: 'variant-1', quantity: 3 },
      { status: 'rejected', productId: 'parent-1', variantId: 'variant-1', reason: 'quantity-adjusted' },
    ]);
  });

  it('answers what is about no line, but not what stands on the cart', () => {
    const { messages } = addedProductsOutcome([{ productId: 'parent-1', variantId: 'variant-1', quantity: 1 }], {
      lineItems: [line('variant-1', 1)],
      errors: [
        { key: 'shipping-method-blocked-Standard', messageKey: 'shipping-method-blocked', level: 10, block: true },
        { key: 'some-plugin-notice', messageKey: 'some-plugin-notice', level: 0, message: 'note' },
      ],
    } as never);

    expect(messages).toEqual([{ code: 'some-plugin-notice', level: 'info', message: 'note', blocksCheckout: false }]);
  });
});

describe('discountCodeOutcome', () => {
  const promotionLine = { id: 'promotion-1', type: 'promotion', referencedId: 'SUMMER' };

  it('reports an applied code as added, answering what it changed but not what stands on the cart', () => {
    const { item, refusal, messages } = discountCodeOutcome('SUMMER', {
      lineItems: [promotionLine],
      errors: [
        { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
        { key: 'promotion-discount-added', messageKey: 'promotion-discount-added', level: 0, message: 'Discount Summer has been added' },
      ],
    } as never);

    expect(item).toEqual({ status: 'added', quantity: 1 });
    expect(refusal).toBeUndefined();
    expect(messages.map((message) => message.message)).toEqual(['Discount Summer has been added']);
  });

  it('reports an unknown code as not-found and does not answer its error again', () => {
    const { item, refusal, messages } = discountCodeOutcome('NOPE', {
      lineItems: [],
      errors: [
        { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20, message: 'Promotion with code NOPE not found!' },
      ],
    } as never);

    expect(item).toEqual({ status: 'rejected', reason: 'not-found', reasonLabel: 'Promotion with code NOPE not found!' });
    expect(refusal).toEqual({
      code: 'discount-not-found',
      level: 'error',
      message: 'Promotion with code NOPE not found!',
      blocksCheckout: false,
    });
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

  it('labels a refusal with its translation', () => {
    const { item } = discountCodeOutcome('SUMMER', {
      lineItems: [],
      errors: [
        {
          key: 'promotion-not-eligible',
          messageKey: 'promotion-not-eligible-already-redeemed',
          level: 0,
          message: 'Promotion SUMMER not eligible for cart!',
          translatedMessage: 'Der Code "SUMMER" wurde bereits eingelöst.',
        },
      ],
    } as never);

    expect(item).toMatchObject({ reasonLabel: 'Der Code "SUMMER" wurde bereits eingelöst.' });
  });

  it('takes an unknown code over an earlier code that no longer applies', () => {
    const { item, messages } = discountCodeOutcome('NOPE', {
      lineItems: [],
      errors: [
        { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
        { key: 'promotion-not-found', messageKey: 'promotion-not-found', level: 20, message: 'NOPE not found' },
      ],
    } as never);

    expect(item).toMatchObject({ status: 'rejected', reason: 'not-found' });
    expect(messages).toEqual([]);
  });

  it('labels a refused code with its own refusal, not with another promotion error', () => {
    const { item } = discountCodeOutcome('WINTER', {
      lineItems: [],
      errors: [
        { key: 'promotion-discount-deleted-p1', messageKey: 'promotion-discount-deleted', level: 0, message: 'Discount removed' },
        { key: 'promotion-not-eligible', messageKey: 'promotion-not-eligible', level: 0, message: 'WINTER not eligible' },
      ],
    } as never);

    expect(item).toEqual({ status: 'rejected', reason: 'discount-not-applicable', reasonLabel: 'WINTER not eligible' });
  });

  it('takes a code refused on a cart worth nothing as not applicable', () => {
    const { item } = discountCodeOutcome('SUMMER', {
      lineItems: [],
      errors: [{ key: 'promotions-on-cart-price-zero-error', messageKey: 'promotions-on-cart-price-zero-error', level: 0, message: 'Cart is free' }],
    } as never);

    expect(item).toEqual({ status: 'rejected', reason: 'discount-not-applicable', reasonLabel: 'Cart is free' });
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

  it('answers no message an item reports as its refusal', () => {
    const refusal = { code: 'custom-promotion-blocked', level: 'warning', message: 'WINTER blocked', blocksCheckout: false } as const;
    const added = { code: 'promotion-discount-added', level: 'info', message: 'Discount Summer added', blocksCheckout: false } as const;

    expect(mutationMessages([{ ...refusal }, added], [refusal])).toEqual({ messages: [added] });
  });
});
