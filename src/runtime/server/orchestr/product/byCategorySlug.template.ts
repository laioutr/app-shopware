import { ProductsByCategorySlugQuery } from '@laioutr-core/canonical-types/ecommerce';
import { RemoteQueryTemplateWithInput } from '@laioutr-core/canonical-types/orchestr';
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
                operator: 'and',
                queries: [
                  { type: 'equals', field: 'linkType', value: 'category' },
                  {
                    type: 'multi',
                    operator: 'or',
                    queries: [
                      { type: 'contains', field: 'name', value: input.term },
                      { type: 'contains', field: 'metaTitle', value: input.term },
                    ],
                  },
                ],
              },
            ]
          : [],
        includes: { seoUrls: ['routeName', 'seoPathInfo'] },
        limit: 25,
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
