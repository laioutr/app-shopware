import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import {
  type AuthChangedPayload,
  type BridgePageLoadedPayload,
  buildInitMessage,
  buildOrderHandoffMessage,
} from '../const/bridge';
import { createBridgeHandler } from '../lib/createBridgeHandler';

export type UseShopwareEmbedBridgeOptions = {
  /** Configured storefront origin; inbound messages are validated (pinned) against it. */
  storefrontOrigin: string;
  onResize?: (height: number) => void;
  onPageLoaded?: (payload: BridgePageLoadedPayload) => void;
  onCheckoutFinish?: (orderId: string) => void;
  onPwRecovery?: () => void;
  onAuthChanged?: (payload: AuthChangedPayload) => void;
};

/**
 * Wires the parent side of the storefront `postMessage` bridge to the real `window`
 * `message` event for the lifetime of the calling component. All decision logic lives in
 * {@link createBridgeHandler} (unit-tested); this only adds/removes the listener and posts
 * through the frame's `contentWindow`.
 *
 * Returns `sendInit` — call it on the iframe's `load` event to proactively complete the
 * handshake, since the plugin's one-shot `ready` can fire before this listener attaches
 * (the SSR iframe loads before Vue hydrates) — and `sendOrderHandoff`, which hands the
 * storefront a freshly minted code for its top-level order submit.
 */
export const useShopwareEmbedBridge = (
  frameRef: Ref<HTMLIFrameElement | null>,
  options: UseShopwareEmbedBridgeOptions
): { sendInit: () => void; sendOrderHandoff: (code: string) => void } => {
  const { handleMessage, sendInit, sendOrderHandoff } = createBridgeHandler({
    getFrameWindow: () => frameRef.value?.contentWindow ?? null,
    storefrontOrigin: options.storefrontOrigin,
    postInit: (frameWindow, targetOrigin) => frameWindow.postMessage(buildInitMessage(), targetOrigin),
    postOrderHandoff: (frameWindow, targetOrigin, code) =>
      frameWindow.postMessage(buildOrderHandoffMessage(code), targetOrigin),
    onResize: options.onResize,
    onPageLoaded: options.onPageLoaded,
    onCheckoutFinish: options.onCheckoutFinish,
    onPwRecovery: options.onPwRecovery,
    onAuthChanged: options.onAuthChanged,
  });

  const listener = (event: MessageEvent) => handleMessage(event);

  onMounted(() => {
    window.addEventListener('message', listener);
    // The SSR iframe can finish loading before we hydrate, so its one-shot `ready` (and the
    // native `load` event) fire before these listeners attach — both missed, with no recovery.
    // Proactively post `init`: if the storefront is already loaded it flushes its buffered
    // messages; if it isn't yet, its later `ready` is caught by the listener above. Idempotent.
    sendInit();
  });
  onBeforeUnmount(() => window.removeEventListener('message', listener));

  return { sendInit, sendOrderHandoff };
};
