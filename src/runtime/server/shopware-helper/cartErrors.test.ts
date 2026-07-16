// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleCartMutationErrors } from './cartErrors';

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
