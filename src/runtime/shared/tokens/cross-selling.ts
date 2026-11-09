import { z } from 'zod/v4';
import { wellKnownString } from '@laioutr-core/core-types/common';
import { defineEntityComponentToken, defineLinkToken } from '@laioutr-core/core-types/orchestr';

/** Shopware's two kinds of cross-selling group: a dynamic product stream, or a hand-picked list. */
export const WELL_KNOWN_CROSS_SELLING_TYPES = ['productStream', 'productList'] as const;

/** A named cross-selling group of a product, as the shop defines it in the product's Cross Selling tab. */
export const ProductCrossSellingBase = defineEntityComponentToken('base', {
  entityType: 'ProductCrossSelling',
  schema: z.object({
    name: z.string(),
    position: z.number().int().meta({ description: "The group's place among the product's groups, lowest first." }),
    type: wellKnownString(WELL_KNOWN_CROSS_SELLING_TYPES),
  }),
});

export const ShopwareProductCrossSellingsLink = defineLinkToken('shopware/product/cross-sellings', {
  label: 'Cross-selling groups (Shopware)',
  description: "The product's active cross-selling groups that hold products, in the shop's order.",
  source: 'Product',
  target: 'ProductCrossSelling',
  type: 'multi',
});

export const ShopwareCrossSellingProductsLink = defineLinkToken('shopware/product-cross-selling/products', {
  label: 'Cross-selling group products (Shopware)',
  description: "The products of one cross-selling group, in the group's own sorting.",
  source: 'ProductCrossSelling',
  target: 'Product',
  type: 'multi',
  defaultLimit: 24,
});

export const ShopwareProductCrossSellingProductsLink = defineLinkToken('shopware/product/cross-selling-products', {
  label: 'Cross-selling products (Shopware)',
  description: "The products of all cross-selling groups of the product, group by group in the shop's order, each product once.",
  source: 'Product',
  target: 'Product',
  type: 'multi',
  defaultLimit: 24,
});
