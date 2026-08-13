import { toRequestCriteria } from './criteria';
import type { ResolveCriteria } from '../types/criteria';
import { resolveProductFields } from '../orchestr-helper/requestedFields';
import { ShopwareProduct, StorefrontClient } from '../types/shopware';

export const fetchAllProducts = async (
  storefrontClient: StorefrontClient,
  { productIds, loadVariants, resolveCriteria }: { productIds: string[]; loadVariants: boolean; resolveCriteria: ResolveCriteria }
) => {
  if (productIds.length === 0) {
    return [];
  }

  const criteria = await resolveProductFields({ loadVariants }, resolveCriteria);

  const response = await storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: productIds,
      ...toRequestCriteria(criteria),
    },
  });

  const products = response.data.elements ?? [];

  const all: ShopwareProduct[] = [...products.flatMap((product) => product.children ?? []), ...products];

  return all;
};
