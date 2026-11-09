import { defineActionToken } from '@laioutr-core/core-types/orchestr';

/**
 * Empty the visitor's cart (Shopware `DELETE /checkout/cart`): every line item and discount code
 * goes. The session and its shipping and payment choices stay.
 *
 * @public
 */
export const ShopwareCartClearAction = defineActionToken('shopware/cart/clear');
