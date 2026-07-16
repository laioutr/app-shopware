/**
 * Build the redeem URL against the `LaioutrConnector` plugin's
 * `/laioutr/connect-session` endpoint.
 *
 * Only the opaque, single-use `code` (minted server-to-server via
 * {@link mintSessionHandoffCode}) travels through the browser — the raw
 * `sw-context-token` never appears in a URL, history, or `Referer`.
 */
export const buildConnectSessionUrl = (params: { storefrontUrl: string; code: string }): string => {
  const base = params.storefrontUrl.replace(/\/+$/, '');
  const query = new URLSearchParams({ code: params.code });
  return `${base}/laioutr/connect-session?${query.toString()}`;
};
