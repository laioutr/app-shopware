import { CategoryBySlugQuery, CategoryNotFoundError } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../middleware/defineShopware';

export default defineShopwareQuery(CategoryBySlugQuery, async ({ context, input }) => {
  const { storefrontClient } = context;

  const { slug } = input;

  const response = await storefrontClient.invoke('readSeoUrl post /seo-url', {
    body: {
      filter: [{ type: 'equals', field: 'seoPathInfo', value: slug }],
    },
  });

  const category = response.data.elements[0];

  if (!category) throw new CategoryNotFoundError(slug);

  return { id: category.id };
});
