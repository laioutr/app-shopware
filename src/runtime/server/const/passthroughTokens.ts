import { createPassthroughToken } from '#imports';
import { ShopwareCart, ShopwareCategory, ShopwareProduct } from '../types/shopware';

export const currentProductIdsToken = createPassthroughToken<string[]>('@laioutr/app-shopware/currentProductIdsFragment');

export const categoriesToken = createPassthroughToken<ShopwareCategory[]>('@laioutr/app-shopware/categories');

/**
 * Product ids returned by the storefront api may actually be variant-ids.
 * In order for the Product.variants link to work, we need to know the parent-id of the products.
 * If no parent-id is given here, assume that the product-id is the parent-id.
 *
 * We cannot let the product-queries return the parent-ids, because the parents contain no data.
 */
export const parentIdToDefaultVariantIdToken = createPassthroughToken<Record<string, string>>(
  '@laioutr/app-shopware/parentIdToDefaultVariantId'
);

export const productsFragmentToken = createPassthroughToken<ShopwareProduct[]>('@laioutr/app-shopware/productsFragment');

export const productVariantsToken = createPassthroughToken<ShopwareProduct[]>('@laioutr/app-shopware/productVariants');

export const cartFragmentToken = createPassthroughToken<ShopwareCart>('@laioutr-app/shopify/cartFragment');
