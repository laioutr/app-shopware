import { hasViolationAt, shopwareErrorCodes, shopwareErrorStatus } from './shopwareErrors';

/**
 * The parameters Shopware's mail templates append to a link (`hash`, `em`), read from the link the
 * customer opened; `undefined` when one of them is missing or empty. Shopware's default templates
 * put them in the query (`/account/recover/password?hash=…`, `/registration/confirm?em=…&hash=…`).
 */
export const readLinkParams = <const TName extends string>(link: string, names: readonly TName[]): Record<TName, string> | undefined => {
  let params: URLSearchParams;
  try {
    params = new URL(link).searchParams;
  } catch {
    return undefined;
  }

  const values = names.map((name) => [name, params.get(name) ?? ''] as const);
  return values.every(([, value]) => value !== '') ? (Object.fromEntries(values) as Record<TName, string>) : undefined;
};

/** Shopware's answer for a recovery hash older than `core.loginRegistration.customerRecoveryTime`, and before 6.6 also for one it does not know. */
const RECOVERY_HASH_EXPIRED = 'CHECKOUT__CUSTOMER_RECOVERY_HASH_EXPIRED';
const NOT_FOUND_BY_HASH = 'CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH';

/**
 * Why Shopware refused a password recovery hash, as the reason `PasswordResetTokenInvalidError`
 * carries; `undefined` for a failure that is not about the hash.
 */
export const recoveryHashFailure = (err: unknown): 'expired' | 'invalid' | undefined => {
  const codes = shopwareErrorCodes(err);
  if (codes.includes(RECOVERY_HASH_EXPIRED)) return 'expired';
  if (codes.includes(NOT_FOUND_BY_HASH) || shopwareErrorStatus(err) === 404 || hasViolationAt(err, ['/hash'])) return 'invalid';
  return undefined;
};

/** Whether Shopware refused a confirmation link's `hash` or `em`: unknown, not matching, or malformed. */
export const isConfirmationHashRefused = (err: unknown): boolean =>
  shopwareErrorCodes(err).includes(NOT_FOUND_BY_HASH) || shopwareErrorStatus(err) === 404 || hasViolationAt(err, ['/hash', '/em']);
