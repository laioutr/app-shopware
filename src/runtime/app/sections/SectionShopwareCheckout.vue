<script lang="ts">
export const definition = defineSection({
  component: 'SectionShopwareCheckout',
  studio: {
    label: 'Shopware Checkout',
    description: 'Embeds the Shopware storefront checkout on this page.',
    tags: ['Checkout & Cart'],
  },
  slots: [],
  schema: [
    {
      label: 'Content',
      fields: [
        {
          type: 'link',
          name: 'finishLink',
          label: 'Order Confirmation Page',
          description:
            'If set, the customer is redirected here after completing an order, with the order id appended as ?order=. If left empty, Shopware’s own order confirmation page is shown inside the checkout frame instead.',
        },
        {
          type: 'link',
          name: 'checkoutLink',
          label: 'Checkout Page',
          description:
            'The page this section sits on. Used to bring the customer back here when a payment fails or is cancelled, so they can choose another method without leaving the site.',
        },
      ],
    },
  ],
});
</script>

<script setup lang="ts">
import { computed, defineSection, definitionToProps, linkResolver, navigateTo, refreshNuxtData, useRoute } from '#imports';
import type { AuthChangedPayload } from '../const/bridge';
import { ADOPT_SESSION_ENDPOINT_PATH, RETRY_ORDER_QUERY_KEY } from '../../shared/const/checkout';
import ShopwareEmbedFrame from '../components/ShopwareEmbedFrame.vue';

const props = defineProps(definitionToProps(definition));

const route = useRoute();

/**
 * The storefront redirects to these from the top-level window, so they have to be absolute.
 * On the server there is no origin to resolve against; the frame only mints client-side, so
 * the path it would send there is never used.
 */
const toAbsolute = (path: string) => (import.meta.client ? new URL(path, window.location.origin).href : path);

const finishUrl = computed(() => (props.finishLink ? toAbsolute(linkResolver.resolve(props.finishLink)) : undefined));
const checkoutUrl = computed(() =>
  props.checkoutLink ? toAbsolute(linkResolver.resolve(props.checkoutLink)) : undefined
);

/** Set when the storefront bounced a failed payment back here; the frame re-opens it for a retry. */
const retryOrderId = computed(() => {
  const value = route.query[RETRY_ORDER_QUERY_KEY];
  return typeof value === 'string' ? value : undefined;
});

/**
 * On order completion the embedded storefront posts `laioutr:checkout-finish`. Navigate to
 * the page the editor configured in the "Order Confirmation Page" link, carrying the order
 * id as a `?order=` query param. When no link is configured there is nowhere to send the
 * visitor, so stay put and let Shopware's own finish page render inside the frame.
 */
const onCheckoutFinish = async (orderId: string) => {
  if (!props.finishLink) return;
  const path = linkResolver.resolve(props.finishLink);
  await navigateTo({ path, query: { order: orderId } });
};

/**
 * On a storefront login/logout inside the frame the bridge posts `laioutr:auth-changed`.
 * Adopt (or clear) the session server-side — the single-use code is redeemed there, the
 * token never touching the browser — then refresh server-rendered data so laioutr reflects
 * the new auth state.
 */
const onAuthChanged = async (payload: AuthChangedPayload) => {
  await $fetch(ADOPT_SESSION_ENDPOINT_PATH, { method: 'POST', body: { code: payload.code } });
  await refreshNuxtData();
};
</script>

<template>
  <ShopwareEmbedFrame
    :finish-url="finishUrl"
    :checkout-url="checkoutUrl"
    :retry-order-id="retryOrderId"
    @checkout-finish="onCheckoutFinish"
    @auth-changed="onAuthChanged"
  />
</template>
