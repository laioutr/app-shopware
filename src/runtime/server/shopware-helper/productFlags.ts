import type { ShopwareProduct } from '../types/shopware';

export interface ProductFlag {
  variant: string;
  label: string;
}

/** Reads the same list and total price as the product's `prices` component, so `sale` agrees with `isOnSale`. */
const isOnSale = (rawProduct: ShopwareProduct, rawVariant: ShopwareProduct) => {
  const listPrice =
    rawProduct.calculatedCheapestPrice?.listPrice?.price ??
    rawProduct.calculatedPrice?.listPrice?.price ??
    rawVariant.calculatedCheapestPrice?.listPrice?.price ??
    rawVariant.calculatedPrice?.listPrice?.price;
  const totalPrice = rawProduct.calculatedCheapestPrice?.totalPrice ?? rawProduct.calculatedPrice?.totalPrice;

  return typeof listPrice === 'number' && typeof totalPrice === 'number' && listPrice > totalPrice;
};

/**
 * Marketing flags Shopware itself carries on a product. `markAsTopseller` is inherited, so a variant
 * reports `null` where the parent decides; `isNew` is computed per row from its release date and the
 * shop's "mark as new" window. Labels are English: a project that renders them localises them in
 * `shopware:product-flags:resolve`, keyed by `variant`.
 */
export const deriveProductFlags = (rawProduct: ShopwareProduct, rawVariant: ShopwareProduct): ProductFlag[] => {
  const flags: ProductFlag[] = [];

  if (rawVariant.isNew ?? rawProduct.isNew) flags.push({ variant: 'new', label: 'New' });
  if (rawVariant.markAsTopseller ?? rawProduct.markAsTopseller) flags.push({ variant: 'topseller', label: 'Topseller' });

  if (isOnSale(rawProduct, rawVariant)) flags.push({ variant: 'sale', label: 'Sale' });

  return flags;
};
