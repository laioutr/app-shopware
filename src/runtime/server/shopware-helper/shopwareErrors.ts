import { InvalidFieldError, type InvalidFieldErrorReason } from '@laioutr-core/canonical-types/ecommerce';

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
    .flatMap((segment) => CANONICAL_FIELD_NAMES[segment] ?? segment),
];

/**
 * Rethrow a Store API validation failure as the canonical {@link InvalidFieldError} for its first
 * violation; any other error is rethrown unchanged. The canonical error names one field, and the
 * first is the one Shopware's own storefront highlights first.
 */
export const throwAsInvalidField = (err: unknown, prefix: string[] = []): never => {
  if (shopwareErrorStatus(err) === 400) {
    const violation = (err as ShopwareApiError).details?.errors?.find((entry) => entry.code && entry.source?.pointer);
    if (violation) {
      throw new InvalidFieldError(toInvalidFieldReason(violation.code!), toCanonicalFieldPath(violation.source!.pointer!, prefix));
    }
  }
  throw err;
};
