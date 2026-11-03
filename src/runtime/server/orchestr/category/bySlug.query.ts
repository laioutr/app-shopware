import { CategoryBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { useSeoResolver } from '../../shopware-helper/useSeoResolver';

export default defineShopwareQuery(CategoryBySlugQuery, async ({ context, input, notFound }) => {
  const { slug } = input;

  const seoResolver = useSeoResolver(context.storefrontClient, context.settings.catalog.seoRouteNames);
  const seoEntry = await seoResolver.resolve('category', slug);

  if (!seoEntry) return notFound();

  return { id: seoEntry.id };
});
