<script lang="ts">
export const definition = defineSection({
  component: 'SectionShopwareCheckout',
  studio: {
    label: 'Shopware Checkout',
    description: 'Embeds the Shopware storefront checkout on this page.',
    tags: ['Checkout & Cart'],
  },
  slots: [],
  schema: [],
});
</script>

<script setup lang="ts">
import { defineSection, definitionToProps, linkResolver, navigateTo } from '#imports';
import { CheckoutFinish } from '../../shared/pageTypes/checkoutFinish.pagetype';
import ShopwareEmbedFrame from '../components/ShopwareEmbedFrame.vue';

defineProps(definitionToProps(definition));

/**
 * On order completion the embedded storefront posts `laioutr:checkout-finish`. Navigate to
 * the page the merchant tagged as the `CheckoutFinish` page type, carrying the order id as
 * a `?order=` query param. If no such page exists the resolver falls back to a non-route.
 */
const onCheckoutFinish = (orderId: string) => {
  const path = linkResolver.resolve({ type: 'pageType', pageType: CheckoutFinish });
  return navigateTo({ path, query: { order: orderId } });
};
</script>

<template>
  <ShopwareEmbedFrame @checkout-finish="onCheckoutFinish" />
</template>
