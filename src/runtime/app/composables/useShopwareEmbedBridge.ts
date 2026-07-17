import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { type BridgePageLoadedPayload, buildInitMessage } from '../const/bridge';
import { createBridgeHandler } from '../lib/createBridgeHandler';

export type UseShopwareEmbedBridgeOptions = {
  /** Configured storefront origin; inbound messages are validated (pinned) against it. */
  storefrontOrigin: string;
  onResize?: (height: number) => void;
  onPageLoaded?: (payload: BridgePageLoadedPayload) => void;
  onCheckoutFinish?: (orderId: string) => void;
  onPwRecovery?: () => void;
};

/**
 * Wires the parent side of the storefront `postMessage` bridge to the real `window`
 * `message` event for the lifetime of the calling component. All decision logic lives in
 * {@link createBridgeHandler} (unit-tested); this only adds/removes the listener and posts
 * the handshake reply through the frame's `contentWindow`.
 */
export const useShopwareEmbedBridge = (frameRef: Ref<HTMLIFrameElement | null>, options: UseShopwareEmbedBridgeOptions): void => {
  const { handleMessage } = createBridgeHandler({
    getFrameWindow: () => frameRef.value?.contentWindow ?? null,
    storefrontOrigin: options.storefrontOrigin,
    postInit: (frameWindow, targetOrigin) => frameWindow.postMessage(buildInitMessage(), targetOrigin),
    onResize: options.onResize,
    onPageLoaded: options.onPageLoaded,
    onCheckoutFinish: options.onCheckoutFinish,
    onPwRecovery: options.onPwRecovery,
  });

  const listener = (event: MessageEvent) => handleMessage(event);

  onMounted(() => window.addEventListener('message', listener));
  onBeforeUnmount(() => window.removeEventListener('message', listener));
};
