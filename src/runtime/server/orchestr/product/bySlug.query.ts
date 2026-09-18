import { ProductBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery({
  implements: ProductBySlugQuery,
  cache: {
    ttl: '1 day',
    swr: true,
    staleMaxAge: '1 hour',
    // The product resolver reads its data source from `parentIdToDefaultVariantIdToken`, and a cache
    // hit skips the handler that sets it. Replaying it keeps a hit resolving the default variant
    // rather than the parent, which carries different prices and media.
    includePassthrough: true,
  },
  run: async ({ context, input, passthrough }) => {
    const seoResolver = useSeoResolver(context.storefrontClient, context.settings.catalog.seoRouteNames);
    const seoEntry = await seoResolver.resolve('product', input.slug);
    if (!seoEntry) {
      throw new Error(`No product found for slug: ${input.slug}`);
    }

    // We need to figure out the parent-id of the product, because the product-resolver expects the parent-id. SeoResolver might return a variant-id.
    const getProductParentId = useGetProductParentId(context.storefrontClient);
    const parentId = await getProductParentId(seoEntry.id);
    const productId = parentId ?? seoEntry.id; // If no parent-id is found, use the seo-entry-id as the product-id.

    // Tell the product-resolver which variant to use.
    passthrough.set(parentIdToDefaultVariantIdToken, { [productId]: seoEntry.id });

    return {
      id: productId,
    };
  },
});
