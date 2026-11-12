// @vitest-environment node
import { ApiClientError, type ApiError } from '@shopware/api-client';
import { describe, expect, it } from 'vitest';
import { throwAsReviewError } from './reviewErrors';
import {
  InvalidFieldError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewsDisabledError,
  UnauthenticatedError,
} from '@laioutr-core/canonical-types/ecommerce';

/** Shopware's answer as the API client throws it. */
const refusal = (status: number, errors: ApiError[]) =>
  new ApiClientError({ _data: { errors }, status, statusText: '', url: '/store-api/product/p1/review', headers: new Headers() } as never);

const violation = (code: string, pointer: string, parameters: Record<string, string> = {}): ApiError => ({
  status: '400',
  code,
  title: 'Constraint violation error',
  source: { pointer },
  meta: { parameters },
});

const thrownBy = (err: unknown): unknown => {
  try {
    return throwAsReviewError(err, 'p1');
  } catch (thrown) {
    return thrown;
  }
};

describe('throwAsReviewError', () => {
  it('reports a missing session as unauthenticated, for the code before Shopware 6.7 and the one since', () => {
    expect(thrownBy(refusal(403, [{ status: '403', code: 'FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN' }]))).toBeInstanceOf(
      UnauthenticatedError
    );
    expect(thrownBy(refusal(403, [{ status: '403', code: 'CHECKOUT__CUSTOMER_NOT_LOGGED_IN' }]))).toBeInstanceOf(UnauthenticatedError);
  });

  it('reports reviews switched off in the sales channel, although Shopware answers it with 403 too', () => {
    expect(thrownBy(refusal(403, [{ status: '403', code: 'PRODUCT__REVIEW_NOT_ACTIVE' }]))).toBeInstanceOf(ReviewsDisabledError);
  });

  it('reports a second review by the same customer, ahead of any field violation', () => {
    const error = thrownBy(
      refusal(400, [
        violation('VIOLATION::TOO_SHORT_ERROR', '/content', { '{{ limit }}': '40' }),
        violation('VIOLATION::ENTITY_EXISTS', '/customerId'),
      ])
    );

    expect(error).toBeInstanceOf(ReviewAlreadyExistsError);
    expect((error as ReviewAlreadyExistsError).data).toEqual({ productId: 'p1' });
  });

  it("reports an update of a review that is no longer the customer's, ahead of any field violation", () => {
    const error = thrownBy(
      refusal(400, [
        violation('VIOLATION::TOO_SHORT_ERROR', '/title', { '{{ limit }}': '5' }),
        violation('VIOLATION::ENTITY_DOES_NOT_EXISTS', '/id'),
      ])
    );

    expect(error).toBeInstanceOf(ReviewNotFoundError);
    expect((error as ReviewNotFoundError).data).toEqual({ productId: 'p1' });
  });

  it('names the field and the minimum of a text that is too short', () => {
    const error = thrownBy(
      refusal(400, [violation('VIOLATION::TOO_SHORT_ERROR', '/content', { '{{ limit }}': '40', '{{ value }}': '"meh"' })])
    );

    expect(error).toBeInstanceOf(InvalidFieldError);
    expect((error as InvalidFieldError).data).toEqual({ reason: 'TOO_SHORT', field: ['content'], limit: 40 });
  });

  it('does not take an existing entity on another field for a second review', () => {
    expect(thrownBy(refusal(400, [violation('VIOLATION::ENTITY_EXISTS', '/productId')]))).toBeInstanceOf(InvalidFieldError);
  });

  it('rethrows any other refusal unchanged', () => {
    const unknown = refusal(500, [{ status: '500', code: 'FRAMEWORK__SOMETHING' }]);
    expect(thrownBy(unknown)).toBe(unknown);

    const withoutPointer = refusal(400, [{ status: '400', code: 'VIOLATION::IS_BLANK_ERROR' }]);
    expect(thrownBy(withoutPointer)).toBe(withoutPointer);

    const network = new TypeError('fetch failed');
    expect(thrownBy(network)).toBe(network);
  });
});
