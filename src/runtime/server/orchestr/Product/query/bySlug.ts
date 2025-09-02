import { ProductBySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { defineShopwareQuery } from '../../../middleware/defineShopware';
import { isSlugMatchingSeoPath } from '../../../shopware-helper/mappers/slugMapper';

export default defineShopwareQuery(ProductBySlugQuery, async ({ context, input }) => {
  const swResponse = await context.storefrontClient.invoke('readSeoUrl post /seo-url', {
    body: {
      filter: [
        {
          field: 'seoPathInfo',
          type: 'contains',
          value: input.slug,
        },
      ],
    },
  });

  const bestMatch = swResponse.data.elements.find((element) => isSlugMatchingSeoPath(input.slug, element.seoPathInfo));
  const productId = bestMatch?.foreignKey;

  if (!productId) {
    throw new Error(`No product found for slug: ${input.slug}`);
  }

  return {
    id: productId,
  };
});
