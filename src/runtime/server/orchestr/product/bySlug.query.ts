import { ProductBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery(ProductBySlugQuery, async ({ context, input, passthrough }) => {
  const seoResolver = useSeoResolver(context.storefrontClient);
  const seoEntry = await seoResolver.resolve('product', input.slug);
  if (!seoEntry) {
    throw new Error(`No product found for slug: ${input.slug}`);
  }

  const getProductParentId = useGetProductParentId(context.storefrontClient);
  const parentId = await getProductParentId(seoEntry.id);

  // Tell the product-resolver which variant to use.
  passthrough.set(parentIdToDefaultVariantIdToken, { [parentId ?? seoEntry.id]: seoEntry.id });

  return {
    id: parentId ?? seoEntry.id,
  };
});
