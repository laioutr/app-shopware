import { BRIDGE_SOURCE, BRIDGE_VERSION, type BridgeInboundMessage } from '../const/bridge';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Validate a raw `MessageEvent.data` against the bridge envelope and return a typed
 * inbound message, or `null` for anything that isn't a well-formed message we handle.
 *
 * Rejects a wrong `source`/`version`, unknown `type`, and payloads missing their
 * required fields (a `resize` without a numeric `height`, a `checkout-finish` without a
 * string `orderId`). Contentless messages (`ready`, `pw-recovery`) always normalise to an
 * empty payload.
 */
export const parseBridgeMessage = (data: unknown): BridgeInboundMessage | null => {
  if (!isObject(data)) return null;
  if (data.source !== BRIDGE_SOURCE || data.version !== BRIDGE_VERSION) return null;

  const payload = isObject(data.payload) ? data.payload : {};

  switch (data.type) {
    case 'laioutr:ready':
      return { type: 'laioutr:ready', payload: {} };
    case 'laioutr:pw-recovery':
      return { type: 'laioutr:pw-recovery', payload: {} };
    case 'laioutr:resize':
      return typeof payload.height === 'number' ? { type: 'laioutr:resize', payload: { height: payload.height } } : null;
    case 'laioutr:checkout-finish':
      return typeof payload.orderId === 'string' ? { type: 'laioutr:checkout-finish', payload: { orderId: payload.orderId } } : null;
    case 'laioutr:page-loaded':
      return typeof payload.path === 'string' ?
          {
            type: 'laioutr:page-loaded',
            payload: {
              path: payload.path,
              route: typeof payload.route === 'string' ? payload.route : null,
              navigationId: typeof payload.navigationId === 'string' ? payload.navigationId : null,
              salesChannelId: typeof payload.salesChannelId === 'string' ? payload.salesChannelId : null,
            },
          }
        : null;
    default:
      return null;
  }
};
