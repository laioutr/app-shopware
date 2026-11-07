import {
  AddressNotFoundError,
  InvalidFieldError,
  type InvalidFieldErrorReason,
  UnauthenticatedError,
} from '@laioutr-core/canonical-types/ecommerce';

type ShopwareErrorEntry = { code?: string; status?: string; detail?: string; source?: { pointer?: string } };

/** The parts of `@shopware/api-client`'s `ApiClientError` the mapping reads. */
type ShopwareApiError = { status?: number; details?: { errors?: ShopwareErrorEntry[] } };

const isShopwareApiError = (err: unknown): err is ShopwareApiError =>
  typeof err === 'object' && err !== null && 'status' in err && 'details' in err;

/** The HTTP status of a failed Store API call, or `undefined` for any other error. */
export const shopwareErrorStatus = (err: unknown): number | undefined => (isShopwareApiError(err) ? err.status : undefined);

/** The error codes of a failed Store API call (`CHECKOUT__CUSTOMER_NOT_LOGGED_IN`, `VIOLATION::IS_BLANK_ERROR`, …). */
export const shopwareErrorCodes = (err: unknown): string[] =>
  isShopwareApiError(err) ? (err.details?.errors ?? []).map((entry) => entry.code ?? '').filter(Boolean) : [];

/**
 * Shopware names its constraint violations after the Symfony constraint error constant. Those with a
 * canonical counterpart map onto it; the rest — `CUSTOMER_EMAIL_NOT_UNIQUE` and other shop-specific
 * rules — travel as their own name, which a storefront can translate.
 */
const VIOLATION_REASONS: Record<string, InvalidFieldErrorReason> = {
  IS_BLANK_ERROR: 'MISSING',
  IS_NULL_ERROR: 'MISSING',
  TOO_LONG_ERROR: 'TOO_LONG',
  TOO_SHORT_ERROR: 'TOO_SHORT',
  INVALID_FORMAT_ERROR: 'INVALID_FORMAT',
  REGEX_FAILED_ERROR: 'INVALID_FORMAT',
  NO_SUCH_CHOICE_ERROR: 'INVALID_VALUE',
  NOT_EQUAL_ERROR: 'INVALID_VALUE',
};

export const toInvalidFieldReason = (code: string): InvalidFieldErrorReason => {
  const name = code.replace(/^VIOLATION::/, '');
  return VIOLATION_REASONS[name] ?? name;
};

/** Shopware's address and customer field names, keyed to the canonical `MailingAddress` / `PersonName` ones. */
const CANONICAL_FIELD_NAMES: Record<string, string> = {
  billingAddress: 'address',
  street: 'address1',
  additionalAddressLine1: 'address2',
  zipcode: 'postalCode',
  countryId: 'countryCode',
  countryStateId: 'provinceCode',
  phoneNumber: 'phone',
  salutationId: 'salutation',
};

/**
 * Turn a violation's JSON pointer into the canonical input path, so the storefront can attach the
 * error to the field it rendered. `prefix` places a pointer that is relative to a nested input —
 * the address actions send the address as the whole body, while the canonical input nests it.
 */
export const toCanonicalFieldPath = (pointer: string, prefix: string[] = []): string[] => [
  ...prefix,
  ...pointer
    .split('/')
    .filter(Boolean)
    .map((segment) => CANONICAL_FIELD_NAMES[segment] ?? segment),
];

/**
 * The camel-cased column a write overflowed. Shopware before 6.7 validates no maximum lengths on
 * customer and address writes, so an over-long value reaches the database and comes back as a 500
 * carrying MySQL's error 1406, which names the column but not the field that fed it.
 */
const overflowedColumn = (entry: ShopwareErrorEntry): string | undefined => {
  if (entry.code !== '1406') return undefined;
  const column = /Data too long for column '(\w+)'/.exec(entry.detail ?? '')?.[1];
  return column?.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
};

/**
 * Rethrow a Store API validation failure as the canonical {@link InvalidFieldError} for its first
 * violation; any other error is rethrown unchanged. The canonical error names one field, and the
 * first is the one Shopware's own storefront highlights first.
 *
 * `columnPointer` places an overflowed database column in the request body, as the JSON pointer a
 * violation would have carried; without it, or when it answers `undefined`, the error is rethrown.
 */
export const throwAsInvalidField = (err: unknown, prefix: string[] = [], columnPointer?: (column: string) => string | undefined): never => {
  const errors = isShopwareApiError(err) ? (err.details?.errors ?? []) : [];

  if (shopwareErrorStatus(err) === 400) {
    const violation = errors.find((entry) => entry.code && entry.source?.pointer);
    if (violation) {
      throw new InvalidFieldError(toInvalidFieldReason(violation.code!), toCanonicalFieldPath(violation.source!.pointer!, prefix));
    }
  }

  if (columnPointer) {
    const column = errors.map(overflowedColumn).find(Boolean);
    const pointer = column ? columnPointer(column) : undefined;
    if (pointer) throw new InvalidFieldError('TOO_LONG', toCanonicalFieldPath(pointer, prefix));
  }

  throw err;
};

/** `columnPointer` for an address or profile body, whose fields are named after the columns they fill. */
export const bodyFieldOfColumn = (column: string) => `/${column}`;

/**
 * Rethrow a failed account call in canonical terms: a context without a customer (401, 403) is
 * {@link UnauthenticatedError}, an address the customer does not own is {@link AddressNotFoundError},
 * and a validation failure is {@link InvalidFieldError}. Anything else is rethrown unchanged.
 */
export const throwAsAccountError = (
  err: unknown,
  {
    addressId,
    fieldPrefix = [],
    columnPointer,
  }: { addressId?: string; fieldPrefix?: string[]; columnPointer?: (column: string) => string | undefined } = {}
): never => {
  const status = shopwareErrorStatus(err);
  if (status === 401 || status === 403) throw new UnauthenticatedError();
  if (addressId && (status === 404 || shopwareErrorCodes(err).includes('CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND'))) {
    throw new AddressNotFoundError(addressId);
  }
  return throwAsInvalidField(err, fieldPrefix, columnPointer);
};

/** Run an account call, rethrowing its failure through {@link throwAsAccountError}. */
export const accountCall = async <T>(call: () => Promise<T>, options?: Parameters<typeof throwAsAccountError>[1]): Promise<T> => {
  try {
    return await call();
  } catch (err) {
    return throwAsAccountError(err, options);
  }
};
