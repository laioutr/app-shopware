import { describe, expect, it } from 'vitest';
import { isConfirmationHashRefused, readLinkParams, recoveryHashFailure } from './mailLink';

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

describe('readLinkParams', () => {
  it("reads Shopware's parameters from the query of the link", () => {
    expect(readLinkParams('https://shop.example.com/registration/confirm?em=abc&hash=def', ['hash', 'em'])).toEqual({
      hash: 'def',
      em: 'abc',
    });
  });

  it('answers undefined for a link that lacks one of them', () => {
    expect(readLinkParams('https://shop.example.com/registration/confirm?hash=def', ['hash', 'em'])).toBeUndefined();
    expect(readLinkParams('https://shop.example.com/account/recover/password?hash=', ['hash'])).toBeUndefined();
  });

  it('answers undefined for a value that is no URL', () => {
    expect(readLinkParams('not a url', ['hash'])).toBeUndefined();
  });
});

describe('recoveryHashFailure', () => {
  it('answers expired for the hash Shopware reports as expired', () => {
    expect(recoveryHashFailure(apiError(410, [{ code: 'CHECKOUT__CUSTOMER_RECOVERY_HASH_EXPIRED' }]))).toBe('expired');
  });

  it('answers invalid for an unknown or malformed hash', () => {
    expect(recoveryHashFailure(apiError(404, [{ code: 'CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH' }]))).toBe('invalid');
    expect(recoveryHashFailure(apiError(400, [{ code: 'VIOLATION::TOO_SHORT_ERROR', source: { pointer: '/hash' } }]))).toBe('invalid');
  });

  it('answers undefined for a failure that is not about the hash', () => {
    expect(recoveryHashFailure(apiError(400, [{ code: 'VIOLATION::TOO_SHORT_ERROR', source: { pointer: '/newPassword' } }]))).toBe(
      undefined
    );
    expect(recoveryHashFailure(apiError(503))).toBeUndefined();
  });
});

describe('isConfirmationHashRefused', () => {
  it('refuses an unknown hash and a mismatching em', () => {
    expect(isConfirmationHashRefused(apiError(404, [{ code: 'CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH' }]))).toBe(true);
    expect(isConfirmationHashRefused(apiError(400, [{ code: 'VIOLATION::NOT_EQUAL_ERROR', source: { pointer: '/em' } }]))).toBe(true);
  });

  it('leaves an outage alone', () => {
    expect(isConfirmationHashRefused(apiError(503))).toBe(false);
  });
});
