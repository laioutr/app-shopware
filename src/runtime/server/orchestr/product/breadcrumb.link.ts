import { ProductBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import { productsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

export default defineShopwareLink({
  implements: ProductBreadcrumbLink,
  provides: [BreadcrumbItemBase],
  run: async ({ context, entityIds, passthrough, $entity }) => {
    const loadProducts = async () => {
      const response = await context.storefrontClient.invoke('readProduct post /product', {
        body: {
          ids: entityIds,
          associations: {
            seoUrls: {},
          },
          includes: {
            product: ['id', 'name', 'translated', 'seoCategory', 'seoUrls'],
            category: ['id', 'name', 'translated', 'seoUrls'],
          },
        },
      });
      return response.data.elements ?? [];
    };

    const products = passthrough.get(productsFragmentToken) ?? (await loadProducts());

    return {
      links: products.map((rawProduct) => {
        const seoCategory = rawProduct.seoCategory;

        const categoryBreadcrumb =
          seoCategory?.id ?
            $entity({
              id: `breadcrumb:${seoCategory.id}`,
              base: () => ({
                name: swTranslated(seoCategory, 'name'),
                link: {
                  type: 'reference' as const,
                  reference: { type: 'Category', slug: entitySlug(seoCategory), id: seoCategory.id },
                },
              }),
            })
          : undefined;

        const productBreadcrumb = $entity({
          id: `breadcrumb:${rawProduct.id}`,
          base: () => ({
            name: swTranslated(rawProduct, 'name'),
            link: {
              type: 'reference' as const,
              reference: { type: 'Product', slug: entitySlug(rawProduct), id: rawProduct.id },
            },
          }),
        });

        return {
          sourceId: rawProduct.id,
          entities: categoryBreadcrumb ? [categoryBreadcrumb, productBreadcrumb] : [productBreadcrumb],
        };
      }),
    };
  },
});
