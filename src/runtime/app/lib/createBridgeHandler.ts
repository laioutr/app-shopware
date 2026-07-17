import { isTrustedOrigin } from './isTrustedOrigin';
import { parseBridgeMessage } from './parseBridgeMessage';
import { type BridgePageLoadedPayload } from '../const/bridge';

/** Minimal `MessageEvent` shape the handler reads — kept structural so it's testable without a DOM. */
export type BridgeMessageEvent = {
  source: unknown;
  origin: string;
  data: unknown;
};

export type CreateBridgeHandlerOptions = {
  /** The embedded frame's content window, or `null` before it mounts. */
  getFrameWindow: () => Window | null;
  /** Configured storefront origin; inbound messages are validated (pinned) against it. */
  storefrontOrigin: string;
  /** Post the contentless handshake reply to the (validated) origin. */
  postInit: (frameWindow: Window, targetOrigin: string) => void;
  onResize?: (height: number) => void;
  onPageLoaded?: (payload: BridgePageLoadedPayload) => void;
  onCheckoutFinish?: (orderId: string) => void;
  onPwRecovery?: () => void;
};

/**
 * The parent side of the storefront `postMessage` bridge, as a pure message dispatcher.
 *
 * Every inbound message must clear three gates before it is acted on:
 * 1. **Identity** — `event.source` is our embedded frame's window (not some other frame).
 * 2. **Origin** — `event.origin` matches the configured storefront origin (the pin).
 * 3. **Envelope** — `parseBridgeMessage` accepts the `{ source, version, type, payload }`.
 *
 * On the storefront's contentless `laioutr:ready` ping it replies `laioutr:init` to the
 * validated origin, which unblocks the plugin's buffered data messages. All logic lives
 * here (no `window`, no Vue) so it is unit-testable; `useShopwareEmbedBridge` only wires
 * it to the real `window` `message` event and the component lifecycle.
 */
export const createBridgeHandler = (options: CreateBridgeHandlerOptions) => {
  const handleMessage = (event: BridgeMessageEvent): void => {
    const frameWindow = options.getFrameWindow();
    if (!frameWindow || event.source !== frameWindow) return;
    if (!isTrustedOrigin(event.origin, options.storefrontOrigin)) return;

    const message = parseBridgeMessage(event.data);
    if (!message) return;

    switch (message.type) {
      case 'laioutr:ready':
        options.postInit(frameWindow, event.origin);
        return;
      case 'laioutr:resize':
        options.onResize?.(message.payload.height);
        return;
      case 'laioutr:page-loaded':
        options.onPageLoaded?.(message.payload);
        return;
      case 'laioutr:checkout-finish':
        options.onCheckoutFinish?.(message.payload.orderId);
        return;
      case 'laioutr:pw-recovery':
        options.onPwRecovery?.();
        return;
      default:
        message satisfies never;
    }
  };

  return { handleMessage };
};
