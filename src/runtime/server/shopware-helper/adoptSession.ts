export interface AdoptSessionTokenParams {
  /** Store-API base URL, e.g. `https://shop.example.com/store-api`. */
  endpoint: string;
  /** Sales-channel access key (sent as the `sw-access-key` header). */
  accessToken: string;
  /** Single-use handoff code received in a `laioutr:auth-changed` message. */
  code: string;
}

/**
 * Extract the human-readable reason from a failed redeem. Store-api errors are
 * `{ errors: [{ status, code, title, detail }] }`; ofetch exposes the parsed body as `err.data`.
 */
const describeAdoptError = (err: unknown): string => {
  const e = err as { data?: { errors?: Array<{ detail?: string; title?: string }>; message?: string }; message?: string };
  const apiError = e?.data?.errors?.[0];
  return apiError?.detail ?? apiError?.title ?? e?.data?.message ?? e?.message ?? 'unknown error';
};

/**
 * Redeem a single-use handoff code for its customer-bound `sw-context-token` against the
 * `LaioutrConnector` plugin's `POST /store-api/laioutr/session-adopt` endpoint.
 *
 * Called server-to-server after a `laioutr:auth-changed` message: the token is returned to
 * laioutr's server only and never reaches the browser. The code is single-use and ~60s TTL.
 *
 * @throws with the plugin's rejection reason on a non-2xx response, or when no token is returned.
 */
export const adoptSessionToken = async (params: AdoptSessionTokenParams): Promise<string> => {
  const base = params.endpoint.replace(/\/+$/, '');

  let res: { 'context-token'?: string };
  try {
    res = await $fetch<{ 'context-token'?: string }>(`${base}/laioutr/session-adopt`, {
      method: 'POST',
      headers: { 'sw-access-key': params.accessToken },
      body: { code: params.code },
    });
  } catch (err) {
    throw new Error(`session-adopt rejected: ${describeAdoptError(err)}`);
  }

  const token = res?.['context-token'];
  if (!token) {
    throw new Error('session-adopt returned no context token');
  }

  return token;
};
