import { createPassthroughToken } from '#imports';
import { ShopwareCategory, ShopwareProduct } from '../types/shopware';
import { Schemas } from '../types/storeApiTypes';

export const currentProductIdsToken = createPassthroughToken<string[]>('@laioutr-app/shopware/currentProductIdsFragment');

export const categoriesToken = createPassthroughToken<ShopwareCategory[]>('@laioutr-app/shopware/categories');

/**
 * Product ids returned by the storefront api may actually be variant-ids.
 * In order for the Product.variants link to work, we need to know the parent-id of the products.
 * If no parent-id is given here, assume that the product-id is the parent-id.
 *
 * We cannot let the product-queries return the parent-ids, because the parents contain no data.
 */
export const parentIdToDefaultVariantIdToken = createPassthroughToken<Record<string, string>>(
  '@laioutr-app/shopware/parentIdToDefaultVariantId'
);

export const productsFragmentToken = createPassthroughToken<ShopwareProduct[]>('@laioutr-app/shopware/productsFragment');

export const productVariantsToken = createPassthroughToken<ShopwareProduct[]>('@laioutr-app/shopware/productVariants');

export const suggestionResultsFragmentToken = createPassthroughToken<{
  id: string;
  suggestions: Array<{
    id: string;
    type: string;
    title: string;
    link:
      | { type: 'reference'; reference: { type: string; id: string; slug: string } }
      | { type: 'pageType'; pageType: string; params: Record<string, string> };
  }>;
}>('@laioutr/app-shopware/completionResults');

export const cartFragmentToken = createPassthroughToken<Schemas['Cart']>('@laioutr-app/shopware/cartFragment');
