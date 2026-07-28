import { definePageTypeToken } from '@laioutr-core/core-types/frontend';

/**
 * The page that hosts the embedded Shopware checkout (`SectionShopwareCheckout`).
 *
 * `kind: 'dynamic'` — exactly one checkout page per project. The cart's `checkoutLink`
 * resolves to whichever page the merchant tags with this type in Studio (see
 * `server/orchestr/cart/base.resolver.ts`), so the resolver never needs to know the
 * page's slug or id.
 */
export const Checkout = definePageTypeToken('shopware/checkout', {
  kind: 'dynamic',
  studio: {
    label: 'Checkout',
    group: 'Shopware',
    icon: 'credit-card',
  },
  pathConstraints: {
    default: '/checkout',
  },
});
