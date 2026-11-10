import type { LinkHandlerArguments } from '@laioutr-core/orchestr/types';
import { cacheProductParentIds } from '../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../const/passthroughTokens';

type PassthroughStore = LinkHandlerArguments['passthrough'];

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
