import { CategoryBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery({
  implements: CategoryBySlugQuery,
  cache: {
    ttl: '1 hour',
    swr: true,
    staleMaxAge: '1 hour',
  },
  run: async ({ context, input }) => {
    const { slug } = input;

    const seoResolver = useSeoResolver(context.storefrontClient, context.settings.catalog.seoRouteNames);
    const seoEntry = await seoResolver.resolve('category', slug);

    if (!seoEntry) {
      throw new Error(`No seo url found for category slug: ${slug}`);
    }

    return { id: seoEntry.id };
  },
});
