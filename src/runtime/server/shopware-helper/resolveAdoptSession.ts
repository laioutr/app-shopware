import type { AdoptSessionTokenParams } from './adoptSession';

export interface AdoptSessionDeps {
  config: { endpoint: string; accessToken: string };
  /** The `code` from a `laioutr:auth-changed` message; absent/empty means logout. */
  code: string | null | undefined;
  /** Injected {@link adoptSessionToken}. */
  adopt: (params: AdoptSessionTokenParams) => Promise<string>;
  /** Injected token persister (real: `persistContextToken` bound to the event). */
  persist: (token: string) => Promise<void>;
  /** Injected token clearer (real: `clearContextToken` bound to the event). */
  clear: () => Promise<void>;
}

/**
 * Decide how a `laioutr:auth-changed` message affects laioutr's stored session. Pure and
 * free of `#imports` so the whole matrix is unit-testable: a `code` means login (redeem →
 * persist); no `code` means logout (clear). The redeemed token stays server-side.
 */
export const adoptSession = async (deps: AdoptSessionDeps): Promise<{ authenticated: boolean }> => {
  if (!deps.code) {
    await deps.clear();
    return { authenticated: false };
  }

  const token = await deps.adopt({
    endpoint: deps.config.endpoint,
    accessToken: deps.config.accessToken,
    code: deps.code,
  });
  await deps.persist(token);

  return { authenticated: true };
};
