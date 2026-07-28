export interface BootstrapContextTokenParams {
  /** Store-API base URL, e.g. `https://shop.example.com/store-api`. */
  endpoint: string;
  /** Sales-channel access key (sent as the `sw-access-key` header). */
  accessToken: string;
}

/**
 * Extract the human-readable reason from a failed bootstrap. Store-api errors are
 * `{ errors: [{ status, code, title, detail }] }`; ofetch exposes the parsed body as `err.data`.
 */
const describeBootstrapError = (err: unknown): string => {
  const e = err as { data?: { errors?: Array<{ detail?: string; title?: string }>; message?: string }; message?: string };
  const apiError = e?.data?.errors?.[0];
  return apiError?.detail ?? apiError?.title ?? e?.data?.message ?? e?.message ?? 'unknown error';
};

/**
 * Mint a fresh guest `sw-context-token` by calling the store-api `GET /context` with only the
 * sales-channel access key. Shopware creates a new guest context and returns its token in the
 * `sw-context-token` response header (hence `$fetch.raw`, to read the header). Read-only — it
 * does not touch the cart.
 *
 * Used by the checkout handoff route so a first-time visitor (no context cookie yet) still gets
 * a session the embedded storefront can adopt, instead of being bounced to the laioutr root.
 *
 * @throws when the store-api call fails or returns no context token.
 */
export const bootstrapGuestContextToken = async (params: BootstrapContextTokenParams): Promise<string> => {
  const base = params.endpoint.replace(/\/+$/, '');

  let token: string | null;
  try {
    const res = await $fetch.raw(`${base}/context`, {
      method: 'GET',
      headers: { 'sw-access-key': params.accessToken },
    });
    token = res.headers.get('sw-context-token');
  } catch (err) {
    throw new Error(`guest context bootstrap failed: ${describeBootstrapError(err)}`);
  }

  if (!token) {
    throw new Error('guest context bootstrap returned no context token');
  }

  return token;
};
