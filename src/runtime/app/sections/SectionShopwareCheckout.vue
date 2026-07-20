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
          description: 'Where the visitor is sent after completing an order. The order id is appended as ?order=.',
        },
      ],
    },
  ],
});
</script>

<script setup lang="ts">
import { defineSection, definitionToProps, linkResolver, navigateTo } from '#imports';
import ShopwareEmbedFrame from '../components/ShopwareEmbedFrame.vue';

const props = defineProps(definitionToProps(definition));

/**
 * On order completion the embedded storefront posts `laioutr:checkout-finish`. Navigate to
 * the page the editor configured in the "Order Confirmation Page" link, carrying the order
 * id as a `?order=` query param. When no link is configured there is nowhere to send the
 * visitor, so stay on the checkout.
 */
const onCheckoutFinish = async (orderId: string) => {
  if (!props.finishLink) return;
  const path = linkResolver.resolve(props.finishLink);
  await navigateTo({ path, query: { order: orderId } });
};
</script>

<template>
  <ShopwareEmbedFrame @checkout-finish="onCheckoutFinish" />
</template>
