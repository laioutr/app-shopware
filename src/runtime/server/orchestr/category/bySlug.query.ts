import { CategoryBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery(CategoryBySlugQuery, async ({ context, input }) => {
  const { slug } = input;

  const seoResolver = useSeoResolver(context.storefrontClient);
  const seoEntry = await seoResolver.resolve('category', slug);
  if (!seoEntry) {
    throw new Error(`No seo url found for category slug: ${slug}`);
  }

  return { id: seoEntry.id };
});
