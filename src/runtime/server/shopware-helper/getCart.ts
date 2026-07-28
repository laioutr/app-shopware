import { StorefrontClient } from '../types/shopware';
import { Schemas } from '../types/storeApiTypes';

/**
 * Fetch the current session cart from the Shopware store-api.
 *
 * The cart is identified per unique context session (the `sw-context-token`
 * header/cookie set by the client factory). Callers cache the result in the
 * `cartFragmentToken` passthrough so a single request resolves the cart once.
 */
export const getCart = async (client: StorefrontClient): Promise<Schemas['Cart']> => {
  const cart = await client.invoke('readCart get /checkout/cart');
  return cart.data;
};
