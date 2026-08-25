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
  /** Absolute URL of the laioutr page shown after a completed order. */
  finishSuccessCallback?: string;
  /** Absolute URL of the laioutr checkout page, used to re-frame a payment retry. */
  checkoutCallback?: string;
  /** Parameters for `redirectRoute`; the retry route is keyed by `orderId`. */
  redirectRouteParams?: Record<string, string>;
}

/**
 * Extract the human-readable reason from a failed mint. Shopware store-api errors are
 * `{ errors: [{ status, code, title, detail }] }`; `$fetch` (ofetch) exposes the parsed
 * body as `err.data`. Falls back to the error message when no structured detail exists.
 */
const describeMintError = (err: unknown): string => {
  const e = err as { data?: { errors?: Array<{ detail?: string; title?: string }>; message?: string }; message?: string };
  const apiError = e?.data?.errors?.[0];
  return apiError?.detail ?? apiError?.title ?? e?.data?.message ?? e?.message ?? 'unknown error';
};

/**
 * Mint a single-use session-handoff code against the `LaioutrConnector` plugin's
 * `POST /store-api/laioutr/session-handoff` endpoint.
 *
 * Called server-to-server: laioutr holds both the sales-channel access key and the
 * shopper's `sw-context-token` (http-only cookie), so the raw token never reaches
 * the browser. The returned code is opaque, single-use, and expires in ~60s.
 *
 * @throws with the plugin's rejection reason when the mint responds non-2xx or without a `code`.
 *   A `400 "Callback domain is not allowed"` means the callback origin is not in the plugin's
 *   `callbackDomainWildcard` allowlist.
 */
export const mintSessionHandoffCode = async (params: MintSessionHandoffParams): Promise<string> => {
  const base = params.endpoint.replace(/\/+$/, '');

  let res: { code?: string };
  try {
    res = await $fetch<{ code?: string }>(`${base}/laioutr/session-handoff`, {
      method: 'POST',
      headers: {
        'sw-access-key': params.accessToken,
        'sw-context-token': params.contextToken,
      },
      // Undefined keys are omitted rather than sent as null, so a plugin build that predates
      // the return trip still accepts the call.
      body: {
        'login-success-callback': params.loginSuccessCallback,
        'logout-success-callback': params.logoutSuccessCallback,
        'redirect-route': params.redirectRoute,
        ...(params.finishSuccessCallback ? { 'finish-success-callback': params.finishSuccessCallback } : {}),
        ...(params.checkoutCallback ? { 'checkout-callback': params.checkoutCallback } : {}),
        ...(params.redirectRouteParams ? { 'redirect-route-params': params.redirectRouteParams } : {}),
      },
    });
  } catch (err) {
    throw new Error(`session-handoff mint rejected: ${describeMintError(err)}`);
  }

  if (!res?.code) {
    throw new Error('session-handoff mint returned no code');
  }

  return res.code;
};
