import type { Link } from '@laioutr-core/core-types/common';
import { Checkout } from '../../shared/pageTypes/checkout.pagetype';
import { CHECKOUT_ENDPOINT_PATH } from '../const/checkout';

/**
 * Where the cart's checkout button points.
 *
 * Embedded, that is the merchant's Studio checkout page, which hosts the frame and performs the
 * session handoff from there. Redirecting, there is no laioutr checkout page at all — the button
 * is a plain anchor to the handoff route, which mints a code and 302s to the storefront.
 *
 * Both are gated on `storefrontUrl`: with no storefront configured there is no checkout to offer.
 */
export const resolveCheckoutLink = (params: {
  storefrontUrl?: string;
  checkoutMode?: 'embedded' | 'redirect';
}): Link | undefined => {
  if (!params.storefrontUrl) {
    return undefined;
  }

  return params.checkoutMode === 'redirect' ?
      { type: 'url', href: CHECKOUT_ENDPOINT_PATH }
    : { type: 'pageType', pageType: Checkout };
};
