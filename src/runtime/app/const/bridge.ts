/**
 * Shared postMessage contract with the LaioutrConnector storefront bridge
 * (`Resources/public/laioutr-embed.js` in the `shopware-laioutr-integration` plugin).
 *
 * Every message uses the envelope `{ source, version, type, payload }`. The `source`
 * discriminator lets each side ignore unrelated postMessage traffic; `version` guards
 * against contract drift. Keep these constants in lock-step with the plugin's bridge.
 */

export const BRIDGE_SOURCE = 'laioutr-shopware';
export const BRIDGE_VERSION = 1;

/** Handshake reply this (parent) frame posts to pin the storefront origin. */
export const BRIDGE_INIT_TYPE = 'laioutr:init';

/** Messages the storefront bridge sends to this (parent) frame. */
export type BridgeInboundMessage =
  | { type: 'laioutr:ready'; payload: Record<string, never> }
  | { type: 'laioutr:resize'; payload: { height: number } }
  | {
      type: 'laioutr:page-loaded';
      payload: { path: string; route: string | null; navigationId: string | null; salesChannelId: string | null };
    }
  | { type: 'laioutr:checkout-finish'; payload: { orderId: string } }
  | { type: 'laioutr:pw-recovery'; payload: Record<string, never> }
  | { type: 'laioutr:auth-changed'; payload: { from: string; code?: string } };

export type BridgeInboundType = BridgeInboundMessage['type'];

export type BridgePageLoadedPayload = Extract<BridgeInboundMessage, { type: 'laioutr:page-loaded' }>['payload'];

export type AuthChangedPayload = Extract<BridgeInboundMessage, { type: 'laioutr:auth-changed' }>['payload'];

/** The full envelope as it arrives on `MessageEvent.data`. */
export type BridgeEnvelope = {
  source: typeof BRIDGE_SOURCE;
  version: typeof BRIDGE_VERSION;
} & BridgeInboundMessage;

/** The contentless handshake reply, posted to the pinned storefront origin. */
export const buildInitMessage = () => ({
  source: BRIDGE_SOURCE,
  version: BRIDGE_VERSION,
  type: BRIDGE_INIT_TYPE,
  payload: {},
});
