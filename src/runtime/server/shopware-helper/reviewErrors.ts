import { isCustomerNotLoggedIn, shopwareErrorCodes, shopwareErrorEntries, throwAsInvalidField } from './shopwareErrors';
import { ReviewAlreadyExistsError, ReviewsDisabledError, UnauthenticatedError } from '@laioutr-core/canonical-types/ecommerce';

/** The `EntityNotExists` constraint on `customerId`: this customer already reviewed this product. */
const isAlreadyReviewed = (err: unknown) =>
  shopwareErrorEntries(err).some((entry) => entry.code === 'VIOLATION::ENTITY_EXISTS' && entry.source?.pointer === '/customerId');

/**
 * Rethrow Shopware's refusal of `saveProductReview` as its canonical error. A violated field is the
 * {@link throwAsInvalidField} error for the first field, and anything else is rethrown unchanged, so
 * it still reaches the caller as a server fault.
 *
 * A second review is checked before the fields: Shopware reports it together with any other violation.
 */
export const throwAsReviewError = (err: unknown, productId: string): never => {
  if (isCustomerNotLoggedIn(err)) throw new UnauthenticatedError();
  if (shopwareErrorCodes(err).includes('PRODUCT__REVIEW_NOT_ACTIVE')) throw new ReviewsDisabledError();
  if (isAlreadyReviewed(err)) throw new ReviewAlreadyExistsError(productId);
  return throwAsInvalidField(err);
};
