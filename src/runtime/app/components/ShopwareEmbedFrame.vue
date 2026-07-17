<script setup lang="ts">
import { computed, ref, useRuntimeConfig } from '#imports';
import { CHECKOUT_ENDPOINT_PATH } from '../../shared/const/checkout';
import { useShopwareEmbedBridge } from '../composables/useShopwareEmbedBridge';

/**
 * Embeds the Shopware storefront checkout in an iframe and speaks the parent side of the
 * `laioutr:*` postMessage bridge (see `useShopwareEmbedBridge`).
 *
 * The iframe `src` is the same-origin handoff route: loading it mints a session-handoff
 * code and 302s the iframe into the embedded storefront, adopting the cart context. Height
 * follows the storefront's `laioutr:resize` messages so there is no inner scrollbar. When
 * `storefrontOrigin` is not configured the embed cannot work, so a notice renders instead.
 */
const emit = defineEmits<{ 'checkout-finish': [orderId: string] }>();

const storefrontOrigin = computed(() => useRuntimeConfig().public['@laioutr-app/shopware']?.storefrontOrigin ?? '');

const frameRef = ref<HTMLIFrameElement | null>(null);
const height = ref<number>();
const loaded = ref(false);

useShopwareEmbedBridge(frameRef, {
  storefrontOrigin: storefrontOrigin.value,
  onResize: (value) => (height.value = value),
  onPageLoaded: () => (loaded.value = true),
  onCheckoutFinish: (orderId) => emit('checkout-finish', orderId),
  // laioutr:pw-recovery is received but unused in v1.
});

const frameStyle = computed(() => ({ height: height.value ? `${height.value}px` : '600px' }));
</script>

<template>
  <div class="shopware-embed-frame">
    <div v-if="!storefrontOrigin" class="shopware-embed-frame__notice">
      The Shopware storefront URL is not configured, so the checkout cannot be embedded.
    </div>
    <template v-else>
      <div v-if="!loaded" class="shopware-embed-frame__loading">Loading checkout…</div>
      <iframe ref="frameRef" :src="CHECKOUT_ENDPOINT_PATH" title="Checkout" class="shopware-embed-frame__iframe" :style="frameStyle" />
    </template>
  </div>
</template>

<style scoped>
.shopware-embed-frame__iframe {
  display: block;
  width: 100%;
  border: 0;
}

.shopware-embed-frame__notice,
.shopware-embed-frame__loading {
  padding: 1rem;
  text-align: center;
}
</style>
