import {
  AddressNotDeletableError,
  AddressNotFoundError,
  InvalidFieldError,
  type InvalidFieldErrorReason,
  UnauthenticatedError,
} from '@laioutr-core/canonical-types/ecommerce';

type ShopwareErrorEntry = {
  code?: string;
  status?: string;
  detail?: string;
  source?: { pointer?: string };
  /** A violation's constraint parameters; PHP serializes an empty map as an empty array. */
  meta?: { parameters?: Record<string, string> | unknown[] };
};

/** The parts of `@shopware/api-client`'s `ApiClientError` the mapping reads. */
type ShopwareApiError = { status?: number; details?: { errors?: ShopwareErrorEntry[] } };

const isShopwareApiError = (err: unknown): err is ShopwareApiError =>
  typeof err === 'object' && err !== null && 'status' in err && 'details' in err;

/** The HTTP status of a failed Store API call, or `undefined` for any other error. */
export const shopwareErrorStatus = (err: unknown): number | undefined => (isShopwareApiError(err) ? err.status : undefined);

/** The error entries of a failed Store API call, or none for any other error. */
export const shopwareErrorEntries = (err: unknown): ShopwareErrorEntry[] => (isShopwareApiError(err) ? (err.details?.errors ?? []) : []);

/** The error codes of a failed Store API call (`CHECKOUT__CUSTOMER_NOT_LOGGED_IN`, `VIOLATION::IS_BLANK_ERROR`, …). */
export const shopwareErrorCodes = (err: unknown): string[] =>
  shopwareErrorEntries(err)
    .map((entry) => entry.code ?? '')
    .filter(Boolean);

/**
 * A context without a customer, coded `CHECKOUT__CUSTOMER_NOT_LOGGED_IN` before Shopware 6.7 and
 * `FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN` since.
 */
export const isCustomerNotLoggedIn = (err: unknown) =>
  shopwareErrorCodes(err).some(
    (code) => code === 'CHECKOUT__CUSTOMER_NOT_LOGGED_IN' || code === 'FRAMEWORK__ROUTING_CUSTOMER_NOT_LOGGED_IN'
  );

/** Whether a failed Store API call carries a violation of one of the given body fields (`/hash`, `/em`, …). */
export const hasViolationAt = (err: unknown, pointers: string[]): boolean =>
  shopwareErrorEntries(err).some((entry) => !!entry.source?.pointer && pointers.includes(entry.source.pointer));

/** Whether a failed Store API call carries the violation `code` on the body field at `pointer`. */
export const hasViolation = (err: unknown, code: string, pointer: string): boolean =>
  shopwareErrorEntries(err).some((entry) => entry.code === code && entry.source?.pointer === pointer);

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

/**
 * Shopware's address, customer and registration field names, keyed to the canonical
 * `MailingAddress` / `PersonName` / `RegistrationConsents` paths.
 */
const CANONICAL_FIELD_NAMES: Record<string, string | string[]> = {
  acceptedDataProtection: ['consents', 'privacyPolicy'],
  billingAddress: 'address',
  street: 'address1',
  additionalAddressLine1: 'address2',
  zipcode: 'postalCode',
  countryId: 'countryCode',
  countryStateId: 'provinceCode',
  phoneNumber: 'phone',
  salutationId: 'salutation',
};

/** Body field names of one Shopware route, keyed to the action input's names where they differ from {@link CANONICAL_FIELD_NAMES}. */
export type FieldNames = Record<string, string | string[]>;

/**
 * Turn a violation's JSON pointer into the canonical input path, so the storefront can attach the
 * error to the field it rendered. `prefix` places a pointer that is relative to a nested input —
 * the address actions send the address as the whole body, while the canonical input nests it.
 * `fieldNames` renames the fields of a route whose body names differ from its action's input:
 * change-password's `password` is the input's `currentPassword`.
 */
export const toCanonicalFieldPath = (pointer: string, prefix: string[] = [], fieldNames: FieldNames = {}): string[] => [
  ...prefix,
  ...pointer
    .split('/')
    .filter(Boolean)
    .flatMap((segment) => fieldNames[segment] ?? CANONICAL_FIELD_NAMES[segment] ?? segment),
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

/** The length or value a violation names as allowed, such as the minimum of a text that is too short. */
const limitOf = (violation: ShopwareErrorEntry): number | undefined => {
  const parameters = violation.meta?.parameters;
  const limit = Array.isArray(parameters) ? Number.NaN : Number(parameters?.['{{ limit }}']);
  return Number.isFinite(limit) ? limit : undefined;
};

/**
 * Rethrow a Store API validation failure as the canonical {@link InvalidFieldError} for its first
 * violation, with the limit Shopware names; any other error is rethrown unchanged. The canonical
 * error names one field, and the first is the one Shopware's own storefront highlights first.
 *
 * `columnPointer` places an overflowed database column in the request body, as the JSON pointer a
 * violation would have carried; without it, or when it answers `undefined`, the error is rethrown.
 */
export const throwAsInvalidField = (
  err: unknown,
  prefix: string[] = [],
  columnPointer?: (column: string) => string | undefined,
  fieldNames?: FieldNames
): never => {
  const errors = shopwareErrorEntries(err);

  if (shopwareErrorStatus(err) === 400) {
    const violation = errors.find((entry) => entry.code && entry.source?.pointer);
    if (violation) {
      throw new InvalidFieldError(
        toInvalidFieldReason(violation.code!),
        toCanonicalFieldPath(violation.source!.pointer!, prefix, fieldNames),
        limitOf(violation)
      );
    }
  }

  if (columnPointer) {
    const column = errors.map(overflowedColumn).find(Boolean);
    const pointer = column ? columnPointer(column) : undefined;
    if (pointer) throw new InvalidFieldError('TOO_LONG', toCanonicalFieldPath(pointer, prefix, fieldNames));
  }

  throw err;
};

/** `columnPointer` for an address or profile body, whose fields are named after the columns they fill. */
export const bodyFieldOfColumn = (column: string) => `/${column}`;

/**
 * Shopware's refusals to delete an address it keeps: a default address, and before 6.7.3 also the
 * address active in the current context. Either way the shop still uses the address, so both are
 * the one canonical refusal.
 */
const UNDELETABLE_ADDRESS_CODES = ['CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT', 'CHECKOUT__CUSTOMER_ADDRESS_IS_ACTIVE'];

/**
 * Rethrow a failed account call in canonical terms: a context without a customer (401, 403) is
 * {@link UnauthenticatedError}, an address the customer does not own is {@link AddressNotFoundError},
 * an address Shopware refuses to delete is {@link AddressNotDeletableError}, and a validation failure
 * is {@link InvalidFieldError}. Anything else is rethrown unchanged.
 */
export const throwAsAccountError = (
  err: unknown,
  {
    addressId,
    fieldPrefix = [],
    columnPointer,
    fieldNames,
  }: { addressId?: string; fieldPrefix?: string[]; columnPointer?: (column: string) => string | undefined; fieldNames?: FieldNames } = {}
): never => {
  const status = shopwareErrorStatus(err);
  if (status === 401 || status === 403) throw new UnauthenticatedError();
  if (addressId && (status === 404 || shopwareErrorCodes(err).includes('CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND'))) {
    throw new AddressNotFoundError(addressId);
  }
  if (addressId && shopwareErrorCodes(err).some((code) => UNDELETABLE_ADDRESS_CODES.includes(code))) {
    throw new AddressNotDeletableError(addressId);
  }
  return throwAsInvalidField(err, fieldPrefix, columnPointer, fieldNames);
};

/** Run an account call, rethrowing its failure through {@link throwAsAccountError}. */
export const accountCall = async <T>(call: () => Promise<T>, options?: Parameters<typeof throwAsAccountError>[1]): Promise<T> => {
  try {
    return await call();
  } catch (err) {
    return throwAsAccountError(err, options);
  }
};
