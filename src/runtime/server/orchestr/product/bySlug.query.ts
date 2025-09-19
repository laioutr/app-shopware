import { ProductBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery(ProductBySlugQuery, async ({ context, input }) => {
  const seoResolver = useSeoResolver(context.storefrontClient);
  const seoEntry = await seoResolver.resolve('product', input.slug);
  if (!seoEntry) {
    throw new Error(`No seo url found for product slug: ${input.slug}`);
  }
  return {
    id: seoEntry.id,
  };
});
