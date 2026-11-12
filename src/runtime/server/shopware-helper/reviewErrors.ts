import { hasViolation, isCustomerNotLoggedIn, shopwareErrorCodes, throwAsInvalidField } from './shopwareErrors';
import {
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewsDisabledError,
  UnauthenticatedError,
} from '@laioutr-core/canonical-types/ecommerce';

/** The `EntityNotExists` constraint on `customerId`: this customer already reviewed this product. */
const isAlreadyReviewed = (err: unknown) => hasViolation(err, 'VIOLATION::ENTITY_EXISTS', '/customerId');

/** The `EntityExists` constraint on an update's `id`: the customer has no review with that id. */
const isReviewGone = (err: unknown) => hasViolation(err, 'VIOLATION::ENTITY_DOES_NOT_EXISTS', '/id');

/**
 * Rethrow Shopware's refusal of `saveProductReview` as its canonical error. A violated field is the
 * {@link throwAsInvalidField} error for the first field, and anything else is rethrown unchanged, so
 * it still reaches the caller as a server fault.
 *
 * A second review and a review that is gone are checked before the fields: Shopware reports them
 * together with any other violation.
 */
export const throwAsReviewError = (err: unknown, productId: string): never => {
  if (isCustomerNotLoggedIn(err)) throw new UnauthenticatedError();
  if (shopwareErrorCodes(err).includes('PRODUCT__REVIEW_NOT_ACTIVE')) throw new ReviewsDisabledError();
  if (isAlreadyReviewed(err)) throw new ReviewAlreadyExistsError(productId);
  if (isReviewGone(err)) throw new ReviewNotFoundError(productId);
  return throwAsInvalidField(err);
};
