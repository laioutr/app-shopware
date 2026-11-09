import type { LinkHandlerArguments } from '@laioutr-core/orchestr/types';
import { cacheProductParentIds } from '../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../const/passthroughTokens';

type PassthroughStore = LinkHandlerArguments['passthrough'];

/**
 * The id to ask Shopware for a product's cross-selling: the variant the request shows, so a variant
 * with groups of its own gets those, as on Shopware's own product page.
 */
export const crossSellingSourceIdOf = (passthrough: PassthroughStore, productId: string) =>
  passthrough.get(parentIdToDefaultVariantIdToken)?.[productId] ?? productId;

/**
 * Hand the linked products' rows to the product resolver, so each tile shows the variant Shopware
 * answered with, as a listing does. Entries set earlier in the request stay unless a target overrides
 * them.
 */
export const passProductTargets = (passthrough: PassthroughStore, defaultVariantIds: Record<string, string>) => {
  passthrough.set(parentIdToDefaultVariantIdToken, { ...passthrough.get(parentIdToDefaultVariantIdToken), ...defaultVariantIds });
  cacheProductParentIds(
    Object.entries(defaultVariantIds).map(([productId, variantId]) => [variantId, variantId === productId ? undefined : productId])
  );
};
