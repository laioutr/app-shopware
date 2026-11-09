import { ProductBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import type { ShopwareProduct } from '../../types/shopware';
import { productsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { type BreadcrumbItemData, readShopwareBreadcrumb, toBreadcrumbItems } from '../../shopware-helper/breadcrumb';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

/** The product's main category alone, the breadcrumb this app answers when Shopware's own cannot be read. */
const seoCategoryItems = (product: ShopwareProduct): BreadcrumbItemData[] => {
  const seoCategory = product.seoCategory;
  if (!seoCategory?.id) return [];
  return [
    {
      id: `breadcrumb:${seoCategory.id}`,
      name: swTranslated(seoCategory, 'name'),
      link: { type: 'reference', reference: { type: 'Category', slug: entitySlug(seoCategory), id: seoCategory.id } },
    },
  ];
};

/**
 * The product's category path, ending in the product. The path is Shopware's own breadcrumb, which
 * walks the main category up to the navigation root with each level's SEO URL; where that read
 * fails, the main category alone stands in for it.
 */
export default defineShopwareLink({
  implements: ProductBreadcrumbLink,
  provides: [BreadcrumbItemBase],
  cache: {
    ttl: '1 hour',
    swr: true,
    staleMaxAge: '1 hour',
  },
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

    const [products, breadcrumbs] = await Promise.all([
      passthrough.get(productsFragmentToken) ?? loadProducts(),
      // One read per product: the route takes a single id.
      Promise.all(entityIds.map((id) => readShopwareBreadcrumb(context.storefrontClient, id, 'product'))),
    ]);

    const toEntity = ({ id, ...base }: BreadcrumbItemData) => $entity({ id, base: () => base });

    return {
      links: products
        .filter((rawProduct) => entityIds.includes(rawProduct.id))
        .map((rawProduct) => {
          const breadcrumb = breadcrumbs[entityIds.indexOf(rawProduct.id)];
          const categoryItems = breadcrumb ? toBreadcrumbItems(breadcrumb) : seoCategoryItems(rawProduct);

          const productItem: BreadcrumbItemData = {
            id: `breadcrumb:${rawProduct.id}`,
            name: swTranslated(rawProduct, 'name'),
            link: { type: 'reference', reference: { type: 'Product', slug: entitySlug(rawProduct), id: rawProduct.id } },
          };

          return {
            sourceId: rawProduct.id,
            entities: [...categoryItems, productItem].map(toEntity),
          };
        }),
    };
  },
});
