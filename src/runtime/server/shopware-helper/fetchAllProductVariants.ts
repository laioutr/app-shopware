import { toRequestCriteria } from './criteria';
import type { ResolveCriteria } from '../types/criteria';
import { resolveProductFields, resolveProductVariantFields } from '../orchestr-helper/requestedFields';
import { ShopwareProduct, StorefrontClient } from '../types/shopware';

export const fetchAllProducts = async (
  storefrontClient: StorefrontClient,
  {
    productIds,
    loadVariants,
    resolveCriteria,
    maxLimit,
  }: { productIds: string[]; loadVariants: boolean; resolveCriteria: ResolveCriteria; maxLimit: number }
) => {
  if (productIds.length === 0) {
    return [];
  }

  const criteria = await resolveProductFields(resolveCriteria);

  const response = await storefrontClient.invoke('readProduct post /product', {
    body: {
      ids: productIds,
      ...toRequestCriteria(criteria),
    },
  });

  const products: ShopwareProduct[] = response.data.elements ?? [];

  if (!loadVariants || products.length === 0) {
    return products;
  }

  // The `children` association hands back every variant a product has, including the ones this
  // sales channel cannot sell — a shopper offered one of those gets a product-not-found from the
  // cart. Reading them back through `/product` applies Shopware's own visibility rules instead.
  const variantCriteria = await resolveProductVariantFields(resolveCriteria);
  const parentIds = products.map((product) => product.id);
  const variants: ShopwareProduct[] = [];
  const seen = new Set<string>();

  for (let page = 1; ; page++) {
    const variantResponse = await storefrontClient.invoke('readProduct post /product', {
      body: {
        page,
        limit: maxLimit,
        filter: [{ type: 'equalsAny', field: 'parentId', value: parentIds }],
        ...toRequestCriteria(variantCriteria),
      },
    });

    const elements: ShopwareProduct[] = variantResponse.data.elements ?? [];
    const fresh = elements.filter((element) => element.id && !seen.has(element.id));
    for (const element of fresh) seen.add(element.id!);
    variants.push(...fresh);

    // A short page ends the walk; a set that divides exactly costs one extra empty read. A full page
    // that repeats the last one means the read ignored `page`, where walking on would never end.
    if (elements.length < maxLimit || fresh.length === 0) break;
  }

  return [...variants, ...products];
};
