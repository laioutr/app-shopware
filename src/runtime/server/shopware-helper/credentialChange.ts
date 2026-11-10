import { type FieldNames, shopwareErrorCodes, throwAsAccountError } from './shopwareErrors';
import { CurrentPasswordInvalidError } from '@laioutr-core/canonical-types/ecommerce';

/**
 * Shopware's refusal of the current password on a credential change: the `CustomerPasswordMatches`
 * violation, and the bad-credentials answer a route that re-authenticates gives instead.
 */
const WRONG_PASSWORD_CODES = ['VIOLATION::CUSTOMER_PASSWORD_NOT_CORRECT', 'CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS'];

/**
 * Rethrow a failed password or email change in canonical terms. A wrong current password is
 * {@link CurrentPasswordInvalidError}, a 400 rather than the 401 that reads as a lost session; the
 * rest goes through {@link throwAsAccountError}, with the route's `password` reported on the input's
 * `currentPassword` and `extraFieldNames` naming the confirmation fields the action fills itself.
 */
export const throwAsCredentialChangeError = (err: unknown, extraFieldNames: FieldNames = {}): never => {
  if (shopwareErrorCodes(err).some((code) => WRONG_PASSWORD_CODES.includes(code))) throw new CurrentPasswordInvalidError();
  return throwAsAccountError(err, { fieldNames: { password: 'currentPassword', ...extraFieldNames } });
};
