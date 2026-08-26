import type { Link } from '@laioutr-core/core-types/common';
import { Checkout } from '../../shared/pageTypes/checkout.pagetype';
import { CHECKOUT_ENDPOINT_PATH } from '../const/checkout';

/**
 * Where the cart's checkout button points.
 *
 * Embedded, that is the merchant's Studio checkout page, which hosts the frame and performs the
 * session handoff from there. Redirecting, there is no laioutr checkout page at all — the button
 * goes to the handoff route, which mints a code and 302s to the storefront.
 *
 * That redirect target is absolute on purpose. The handoff route is a server route, not a page,
 * and frontend-core's catch-all matches every path — so a relative href would be client-routed
 * into a 404 instead of reaching the server at all. An absolute URL leaves the Vue app.
 *
 * Both are gated on `storefrontUrl`: with no storefront configured there is no checkout to offer.
 */
export const resolveCheckoutLink = (params: {
  storefrontUrl?: string;
  checkoutMode?: 'embedded' | 'redirect';
  origin?: string;
}): Link | undefined => {
  if (!params.storefrontUrl) {
    return undefined;
  }

  if (params.checkoutMode !== 'redirect') {
    return { type: 'pageType', pageType: Checkout };
  }

  return {
    type: 'url',
    href: params.origin ? new URL(CHECKOUT_ENDPOINT_PATH, params.origin).href : CHECKOUT_ENDPOINT_PATH,
  };
};
