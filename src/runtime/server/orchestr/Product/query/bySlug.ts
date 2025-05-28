import { z } from 'zod';
import { defineQueryToken } from '@laioutr-core/canonical-types/query';
import { defineShopwareQuery } from '../../../action/defineShopwareAction';

const ProductBySlug = defineQueryToken('ecommerce/product/by-slug', {
  entity: 'Product',
  type: 'single',
  label: 'Product by slug',
  input: z.object({
    slug: z.string(),
  }),
});

export default defineShopwareQuery(ProductBySlug, async ({ context, input }) => {
  const swResponse = await context.storefrontClient.invoke('readSeoUrl post /seo-url', {
    body: {
      filter: [
        {
          field: 'seoPathInfo',
          type: 'equals',
          value: input.slug,
        },
      ],
    },
  });

  const productId = swResponse.data.elements.at(0)?.foreignKey;
  if (!productId) {
    throw new Error(`No product found for slug: ${input.slug}`);
  }

  return {
    id: productId,
  };
});
