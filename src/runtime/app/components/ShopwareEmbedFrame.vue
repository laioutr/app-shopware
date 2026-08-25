<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useRuntimeConfig } from '#imports';
import type { AuthChangedPayload, BridgePageLoadedPayload } from '../const/bridge';
import {
  CHECKOUT_CONFIRM_ROUTE,
  CHECKOUT_ENDPOINT_PATH,
  ORDER_HANDOFF_ENDPOINT_PATH,
  RETRY_ORDER_QUERY_KEY,
} from '../../shared/const/checkout';
import { useShopwareEmbedBridge } from '../composables/useShopwareEmbedBridge';
import { createOrderHandoffRefresher } from '../lib/createOrderHandoffRefresher';

/**
 * Embeds the Shopware storefront checkout in an iframe and speaks the parent side of the
 * `laioutr:*` postMessage bridge (see `useShopwareEmbedBridge`).
 *
 * The iframe `src` is the same-origin handoff route: loading it mints a session-handoff
 * code and 302s the iframe into the embedded storefront, adopting the cart context. Height
 * follows the storefront's `laioutr:resize` messages so there is no inner scrollbar. When
 * `storefrontOrigin` is not configured the embed cannot work, so a notice renders instead.
 *
 * The storefront's confirm form submits into the top-level window rather than the frame, so
 * redirect-based payment providers are never framed — they refuse it, and a framed provider
 * cannot navigate the top window back out. That submit needs a handoff code, which this
 * component keeps fresh in the frame for as long as the shopper is on the confirm page.
 */
const emit = defineEmits<{ 'checkout-finish': [orderId: string]; 'auth-changed': [payload: AuthChangedPayload] }>();

const props = defineProps<{
  /** Absolute URL of the page a completed order lands on. */
  finishUrl?: string;
  /** Absolute URL of this checkout page, used to re-frame a failed payment's retry. */
  checkoutUrl?: string;
  /** Order whose payment failed, re-framed on the storefront's order-edit page. */
  retryOrderId?: string;
}>();

const storefrontOrigin = computed(() => useRuntimeConfig().public['@laioutr/app-shopware']?.storefrontOrigin ?? '');

const frameRef = ref<HTMLIFrameElement | null>(null);
const height = ref<number>();
const loaded = ref(false);

/**
 * Mint failures are swallowed: the frame keeps whatever code it last received, and submits
 * in-frame if it never received one — degraded, but no worse than not running this at all.
 */
const handoff = createOrderHandoffRefresher({
  mint: async () => {
    try {
      const response = await $fetch<{ code: string }>(ORDER_HANDOFF_ENDPOINT_PATH, {
        method: 'POST',
        body: { finishUrl: props.finishUrl, checkoutUrl: props.checkoutUrl },
      });
      return response.code;
    } catch {
      return null;
    }
  },
  deliver: (code) => sendOrderHandoff(code),
});

// The storefront posts `page-loaded` on every in-frame page load. The first one reveals the
// frame; each later one is an in-frame navigation, so scroll the parent viewport back to the
// top — mirroring a normal full-page navigation.
let hasShownFramePage = false;
let handoffActive = false;
const onFramePageLoaded = (payload: BridgePageLoadedPayload) => {
  loaded.value = true;

  // Retargeting the form with no configured return would strand the shopper on a Shopware page
  // at the end of a successful order. Staying in the frame is the better degraded state.
  const canReturn = Boolean(props.finishUrl) || payload.returnFallback;

  handoffActive = payload.route === CHECKOUT_CONFIRM_ROUTE && canReturn;

  if (handoffActive) {
    handoff.start();
  } else {
    handoff.stop();
  }

  if (hasShownFramePage) {
    window.scrollTo({ top: 0, left: 0 });
  }
  hasShownFramePage = true;
};

const { sendInit, sendOrderHandoff } = useShopwareEmbedBridge(frameRef, {
  storefrontOrigin: storefrontOrigin.value,
  onResize: (value) => (height.value = value),
  onPageLoaded: onFramePageLoaded,
  onCheckoutFinish: (orderId) => emit('checkout-finish', orderId),
  onAuthChanged: (payload) => emit('auth-changed', payload),
  // laioutr:pw-recovery is received but unused in v1.
});

/**
 * Mint again now that laioutr holds a different context token.
 *
 * The storefront announces a page load before it announces the login that caused it, so the code
 * minted on `page-loaded` still encodes the token from before — redeeming it would install a
 * session with no customer, and the order route would bounce the shopper back to registration.
 */
const refreshHandoff = () => {
  if (handoffActive) handoff.start();
};

defineExpose({ refreshHandoff });

onBeforeUnmount(() => handoff.stop());

/**
 * The plugin's one-shot `laioutr:ready` can fire before our message listener attaches
 * (the SSR iframe loads before hydration), so complete the handshake proactively once the
 * frame has loaded. Also clears the overlay: `load` fires on the storefront document, so
 * it is a reliable "content is showing" signal for each in-frame navigation.
 */
const onFrameLoad = () => {
  loaded.value = true;
  sendInit();
};

/** A retry rides in the frame URL so the same-origin handoff route can target the order-edit page. */
const frameSrc = computed(() =>
  props.retryOrderId ?
    `${CHECKOUT_ENDPOINT_PATH}?${RETRY_ORDER_QUERY_KEY}=${encodeURIComponent(props.retryOrderId)}`
  : CHECKOUT_ENDPOINT_PATH
);

const frameStyle = computed(() => ({ height: height.value ? `${height.value}px` : '600px' }));
</script>

<template>
  <div class="shopware-embed-frame">
    <div v-if="!storefrontOrigin" class="shopware-embed-frame__notice">
      The Shopware storefront URL is not configured, so the checkout cannot be embedded.
    </div>
    <template v-else>
      <div v-if="!loaded" class="shopware-embed-frame__loading" role="status">
        <LLoadingSpinner variant="row" />
        <span class="shopware-embed-frame__loading-label">Loading checkout…</span>
      </div>
      <iframe
        ref="frameRef"
        :src="frameSrc"
        title="Checkout"
        class="shopware-embed-frame__iframe"
        :style="frameStyle"
        @load="onFrameLoad"
      />
    </template>
  </div>
</template>

<style scoped>
.shopware-embed-frame {
  position: relative;
}

.shopware-embed-frame__iframe {
  display: block;
  width: 100%;
  border: 0;
}

.shopware-embed-frame__notice {
  padding: 1rem;
  text-align: center;
}

/* Overlays the iframe instead of stacking above it, so removing it on load shifts nothing. */
.shopware-embed-frame__loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--background-default);
}

.shopware-embed-frame__loading-label {
  font-size: 0.875rem;
  opacity: 0.7;
}
</style>
