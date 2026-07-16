export interface MintSessionHandoffParams {
  /** Store-API base URL, e.g. `https://shop.example.com/store-api`. */
  endpoint: string;
  /** Sales-channel access key (sent as the `sw-access-key` header). */
  accessToken: string;
  /** Context token to hand off (sent as the `sw-context-token` header). */
  contextToken: string;
  /** Allowlist-validated URL the storefront returns to after a login inside checkout. */
  loginSuccessCallback: string;
  /** Allowlist-validated URL the storefront returns to after a logout inside checkout. */
  logoutSuccessCallback: string;
  /** Internal Shopware route the handoff lands on after redeem. */
  redirectRoute: string;
}

/**
 * Mint a single-use session-handoff code against the `LaioutrConnector` plugin's
 * `POST /store-api/laioutr/session-handoff` endpoint.
 *
 * Called server-to-server: laioutr holds both the sales-channel access key and the
 * shopper's `sw-context-token` (http-only cookie), so the raw token never reaches
 * the browser. The returned code is opaque, single-use, and expires in ~60s.
 *
 * @throws if the mint responds non-2xx or without a `code`.
 */
export const mintSessionHandoffCode = async (params: MintSessionHandoffParams): Promise<string> => {
  const base = params.endpoint.replace(/\/+$/, '');

  const res = await $fetch<{ code?: string }>(`${base}/laioutr/session-handoff`, {
    method: 'POST',
    headers: {
      'sw-access-key': params.accessToken,
      'sw-context-token': params.contextToken,
    },
    body: {
      'login-success-callback': params.loginSuccessCallback,
      'logout-success-callback': params.logoutSuccessCallback,
      'redirect-route': params.redirectRoute,
    },
  });

  if (!res?.code) {
    throw new Error('session-handoff mint returned no code');
  }

  return res.code;
};
