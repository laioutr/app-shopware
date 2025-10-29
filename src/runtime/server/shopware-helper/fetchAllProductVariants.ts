import { resolveProductFields } from '../orchestr-helper/requestedFields';
import { ShopwareProduct, StorefrontClient } from '../types/shopware';

export const fetchAllProducts = async (
  storefrontClient: StorefrontClient,
  { productIds, loadVariants }: { productIds: string[]; loadVariants: boolean }
) => {
  const fields = resolveProductFields({ loadVariants });

  const response = await storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: productIds,
      ...fields,
    },
  });

  const products = response.data.elements ?? [];

  const all: ShopwareProduct[] = [...products.flatMap((product) => product.children ?? []), ...products];

  return all;
};
