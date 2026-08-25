import { isTrustedOrigin } from './isTrustedOrigin';
import { parseBridgeMessage } from './parseBridgeMessage';
import { type AuthChangedPayload, type BridgePageLoadedPayload } from '../const/bridge';

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
  /** Post a freshly minted order-handoff code to the (validated) origin. */
  postOrderHandoff: (frameWindow: Window, targetOrigin: string, code: string) => void;
  onResize?: (height: number) => void;
  onPageLoaded?: (payload: BridgePageLoadedPayload) => void;
  onCheckoutFinish?: (orderId: string) => void;
  onPwRecovery?: () => void;
  onAuthChanged?: (payload: AuthChangedPayload) => void;
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
 * validated origin, which unblocks the plugin's buffered data messages.
 *
 * `ready` is a **one-shot** broadcast, and the server-rendered iframe can fire it before
 * this listener is attached (the browser loads the iframe before Vue hydrates). So the
 * handshake must not depend on catching it: {@link sendInit} lets the caller *proactively*
 * post `init` to the configured origin once the frame has loaded. Both paths are
 * idempotent — the plugin just re-pins and re-flushes.
 *
 * All logic lives here (no `window`, no Vue) so it is unit-testable; `useShopwareEmbedBridge`
 * only wires it to the real `window` `message` event and the component lifecycle.
 */
export const createBridgeHandler = (options: CreateBridgeHandlerOptions) => {
  /** Proactively post the handshake to the configured origin (frame-load path). */
  const sendInit = (): void => {
    const frameWindow = options.getFrameWindow();
    if (frameWindow && options.storefrontOrigin) {
      options.postInit(frameWindow, options.storefrontOrigin);
    }
  };

  /**
   * Hand the storefront a freshly minted handoff code so its confirm form can submit into the
   * top-level window with a session to install. Posted to the configured origin rather than a
   * learned one: nothing in the storefront asks for a code, so there is no message to pin off.
   */
  const sendOrderHandoff = (code: string): void => {
    const frameWindow = options.getFrameWindow();
    if (frameWindow && options.storefrontOrigin) {
      options.postOrderHandoff(frameWindow, options.storefrontOrigin, code);
    }
  };

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
      case 'laioutr:auth-changed':
        options.onAuthChanged?.(message.payload);
        return;
      default:
        message satisfies never;
    }
  };

  return { handleMessage, sendInit, sendOrderHandoff };
};
