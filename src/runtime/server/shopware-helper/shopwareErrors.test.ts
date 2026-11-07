import { describe, expect, it } from 'vitest';
import { shopwareErrorCodes, shopwareErrorStatus, throwAsInvalidField, toCanonicalFieldPath, toInvalidFieldReason } from './shopwareErrors';
import { InvalidFieldError } from '@laioutr-core/canonical-types/ecommerce';

const apiError = (status: number, errors: unknown[]) => Object.assign(new Error('Failed request'), { status, details: { errors } });

describe('toInvalidFieldReason', () => {
  it('maps constraint violations onto the canonical reasons', () => {
    expect(toInvalidFieldReason('VIOLATION::IS_BLANK_ERROR')).toBe('MISSING');
    expect(toInvalidFieldReason('VIOLATION::TOO_SHORT_ERROR')).toBe('TOO_SHORT');
    expect(toInvalidFieldReason('VIOLATION::INVALID_FORMAT_ERROR')).toBe('INVALID_FORMAT');
  });

  it('passes a violation without a canonical counterpart through by name', () => {
    expect(toInvalidFieldReason('VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE')).toBe('CUSTOMER_EMAIL_NOT_UNIQUE');
  });
});

describe('toCanonicalFieldPath', () => {
  it('renames Shopware address fields to their canonical names', () => {
    expect(toCanonicalFieldPath('/billingAddress/zipcode')).toEqual(['address', 'postalCode']);
    expect(toCanonicalFieldPath('/email')).toEqual(['email']);
  });

  it('places a pointer relative to a nested input under its prefix', () => {
    expect(toCanonicalFieldPath('/street', ['address'])).toEqual(['address', 'address1']);
  });
});

describe('throwAsInvalidField', () => {
  it('throws the first violation as an InvalidFieldError', () => {
    const err = apiError(400, [
      { code: 'VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE', source: { pointer: '/email' } },
      { code: 'VIOLATION::IS_BLANK_ERROR', source: { pointer: '/billingAddress/city' } },
    ]);

    let thrown: unknown;
    try {
      throwAsInvalidField(err);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(InvalidFieldError);
    expect((thrown as InvalidFieldError).data).toEqual({ reason: 'CUSTOMER_EMAIL_NOT_UNIQUE', field: ['email'] });
  });

  it('throws an overflowed column as a TOO_LONG InvalidFieldError at the pointer the caller places it', () => {
    const err = apiError(500, [
      {
        code: '1406',
        detail:
          "An exception occurred while executing a query: SQLSTATE[22001]: String data, right truncated: 1406 Data too long for column 'phone_number' at row 1",
      },
    ]);

    let thrown: unknown;
    try {
      throwAsInvalidField(err, [], (column) => `/billingAddress/${column}`);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(InvalidFieldError);
    expect((thrown as InvalidFieldError).data).toEqual({ reason: 'TOO_LONG', field: ['address', 'phone'] });
  });

  it('rethrows an overflowed column the caller cannot place, or when no caller places columns', () => {
    const err = apiError(500, [{ code: '1406', detail: "Data too long for column 'zipcode' at row 1" }]);

    expect(() => throwAsInvalidField(err)).toThrow(err);
    expect(() => throwAsInvalidField(err, [], () => undefined)).toThrow(err);
  });

  it('rethrows anything that is not a validation failure', () => {
    const err = apiError(500, [{ code: 'FRAMEWORK__SOMETHING' }]);
    expect(() => throwAsInvalidField(err)).toThrow(err);

    const plain = new Error('network');
    expect(() => throwAsInvalidField(plain)).toThrow(plain);
  });
});

describe('shopwareErrorStatus / shopwareErrorCodes', () => {
  it('reads an API client error', () => {
    const err = apiError(403, [{ code: 'CHECKOUT__CUSTOMER_NOT_LOGGED_IN' }]);
    expect(shopwareErrorStatus(err)).toBe(403);
    expect(shopwareErrorCodes(err)).toEqual(['CHECKOUT__CUSTOMER_NOT_LOGGED_IN']);
  });

  it('answers nothing for another error', () => {
    expect(shopwareErrorStatus(new Error('x'))).toBeUndefined();
    expect(shopwareErrorCodes(new Error('x'))).toEqual([]);
  });
});
