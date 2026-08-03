import { ProductsByCategorySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { RemoteQueryTemplateWithInput } from '@laioutr-core/core-types/orchestr';
import { defineShopwareQueryTemplateProvider } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareQueryTemplateProvider({
  for: ProductsByCategorySlugQuery,
  run: async ({ input, context }) => {
    const { storefrontClient } = context;

    const response = await storefrontClient.invoke('readCategoryList post /category', {
      body: {
        filter:
          input.term ?
            [
              {
                type: 'multi',
                operator: 'or',
                queries: [
                  { type: 'contains', field: 'name', value: input.term },
                  { type: 'contains', field: 'metaTitle', value: input.term },
                ],
              },
            ]
          : [],
        associations: { seoUrls: {} },
        includes: {
          category: ['id', 'name', 'translated', 'seoUrls'],
          seo_url: ['seoPathInfo', 'isCanonical', 'routeName'],
        },
        limit: 50,
      },
    });

    const templates: RemoteQueryTemplateWithInput[] = [];
    for (const element of response.data.elements ?? []) {
      templates.push({
        input: {
          categorySlug: entitySlug(element),
        },
        label: swTranslated(element, 'name'),
      });
    }

    return templates;
  },
});
