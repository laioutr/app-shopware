import { definePageTypeToken } from '@laioutr-core/core-types/frontend';

/**
 * The order-confirmation page shown after the embedded storefront completes an order.
 *
 * `kind: 'dynamic'` — exactly one confirmation page per project. When the embedded
 * storefront posts `laioutr:checkout-finish`, `SectionShopwareCheckout` resolves this
 * page type and navigates to it with the order id as a `?order=` query param.
 */
export const CheckoutFinish = definePageTypeToken('shopware/checkout-finish', {
  kind: 'dynamic',
  studio: {
    label: 'Order Confirmation',
    group: 'Shopware',
    icon: 'receipt',
  },
  pathConstraints: {
    default: '/checkout/finish',
  },
});
