import { buildConnectSessionUrl } from './checkoutUrl';
import type { MintSessionHandoffParams } from './sessionHandoff';
import { CHECKOUT_REDIRECT_ROUTE } from '../const/checkout';

/** Outcome of the checkout handoff decision: a redirect target, or a fail-closed error. */
export type CheckoutPlan =
  | { kind: 'redirect'; url: string }
  | { kind: 'error'; statusCode: number; statusMessage: string; cause?: unknown };

export interface ResolveCheckoutDeps {
  config: { endpoint: string; accessToken: string; storefrontUrl?: string };
  /** Shopware context token from the request cookie (absent for a shopper with no cart yet). */
  contextToken: string | null | undefined;
  /** Request origin used for the login/logout success callbacks. */
  origin: string;
  /** Injected minter (real: {@link mintSessionHandoffCode}) — keeps this decision logic pure/testable. */
  mint: (params: MintSessionHandoffParams) => Promise<string>;
}

/**
 * Decide where a checkout click should send the shopper. Fail-closed and free of I/O beyond the
 * injected `mint` call, so the whole outcome matrix is unit-testable without an h3 event:
 *
 * - no context cookie (empty cart) → redirect to the laioutr frontend root, no mint;
 * - no `storefrontUrl` (misconfig) → 500, no mint;
 * - mint succeeds → redirect to `connect-session?code=…`;
 * - mint throws (e.g. callback not allowlisted) → 502.
 *
 * The Shopware storefront is only ever navigated to for an actual checkout handoff — never as a
 * fallback. No branch mutates the cart.
 */
export const resolveCheckout = async (deps: ResolveCheckoutDeps): Promise<CheckoutPlan> => {
  const { config, contextToken, origin, mint } = deps;

  if (!contextToken) {
    // No cart context — nothing to hand off. Keep the shopper on the laioutr frontend (its root);
    // the Shopware storefront is an implementation detail of checkout, not a place to land.
    return { kind: 'redirect', url: '/' };
  }

  if (!config.storefrontUrl) {
    return { kind: 'error', statusCode: 500, statusMessage: 'Checkout is not configured' };
  }

  try {
    const code = await mint({
      endpoint: config.endpoint,
      accessToken: config.accessToken,
      contextToken,
      loginSuccessCallback: origin,
      logoutSuccessCallback: origin,
      redirectRoute: CHECKOUT_REDIRECT_ROUTE,
    });

    return { kind: 'redirect', url: buildConnectSessionUrl({ storefrontUrl: config.storefrontUrl, code }) };
  } catch (cause) {
    return { kind: 'error', statusCode: 502, statusMessage: 'Checkout handoff failed', cause };
  }
};
