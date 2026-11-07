// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleCartMutationErrors, takeDiscountCodeErrors } from './cartErrors';

describe('handleCartMutationErrors', () => {
  it('throws on a blocking (level 20) error', () => {
    expect(() =>
      handleCartMutationErrors([{ key: 'product-stock-reached', level: 20, message: 'Out of stock', messageKey: 'stock' }] as never)
    ).toThrow(/stock/i);
  });

  it('does not throw on notices or warnings', () => {
    expect(() => handleCartMutationErrors([{ key: 'a', level: 0, message: 'note' }] as never)).not.toThrow();
    expect(() => handleCartMutationErrors([{ key: 'b', level: 10, message: 'warn' }] as never)).not.toThrow();
  });

  it('normalizes the keyed-object error form and throws on a blocking entry', () => {
    expect(() =>
      handleCartMutationErrors({ 'some-id': { code: 1, key: 'x', level: 20, message: 'boom', messageKey: 'boom-key' } } as never)
    ).toThrow(/boom/i);
  });

  it('is a no-op when there are no errors', () => {
    expect(() => handleCartMutationErrors(undefined)).not.toThrow();
    expect(() => handleCartMutationErrors([] as never)).not.toThrow();
  });
});

describe('takeDiscountCodeErrors', () => {
  it('takes a rejected code out of the blocking errors', () => {
    const { rejections, rest } = takeDiscountCodeErrors([
      { key: 'promotion-not-found', level: 20, message: 'Promotion with code NOPE not found!', messageKey: 'promotion-not-found' },
    ] as never);

    expect(rejections).toHaveLength(1);
    expect(rest).toHaveLength(0);
    expect(() => handleCartMutationErrors(rest)).not.toThrow();
  });

  it('takes an ineligible code, whose key carries the reason as a suffix', () => {
    const { rejections } = takeDiscountCodeErrors([
      { key: 'promotion-not-eligible', level: 0, messageKey: 'promotion-not-eligible-cart-value' },
    ] as never);

    expect(rejections).toHaveLength(1);
  });

  it('leaves a lapsed automatic promotion blocking', () => {
    const errors = [
      { key: 'auto-promotion-not-found', level: 20, message: 'gone', messageKey: 'auto-promotion-not-found' },
    ] as never;
    const { rejections, rest } = takeDiscountCodeErrors(errors);

    expect(rejections).toHaveLength(0);
    expect(rest).toHaveLength(1);
    expect(() => handleCartMutationErrors(rest)).toThrow(/auto-promotion-not-found/);
  });

  it('leaves unrelated errors alone', () => {
    const { rejections, rest } = takeDiscountCodeErrors([
      { key: 'product-stock-reached', level: 20, message: 'Out of stock', messageKey: 'product-stock-reached' },
    ] as never);

    expect(rejections).toHaveLength(0);
    expect(rest).toHaveLength(1);
  });

  it('normalizes the keyed-object error form', () => {
    const { rejections } = takeDiscountCodeErrors({
      'promotion-not-found': { code: 1, key: 'promotion-not-found', level: 20, message: 'nope', messageKey: 'promotion-not-found' },
    } as never);

    expect(rejections).toHaveLength(1);
  });

  it('is a no-op when there are no errors', () => {
    expect(takeDiscountCodeErrors(undefined)).toEqual({ rejections: [], rest: [] });
  });
});
