import { ProductBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import type { ShopwareProduct } from '../../types/shopware';
import { productsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import {
  type BreadcrumbItemData,
  readProductMainCategory,
  readShopwareBreadcrumbs,
  readTrailsOfPaths,
  toBreadcrumbItems,
} from '../../shopware-helper/breadcrumb';
import { entitySlug } from '../../shopware-helper/mappers/slugMapper';
import { swTranslated } from '../../shopware-helper/swTranslated';

/**
 * The product's category path, ending in the product as the current page. The path is Shopware's own
 * breadcrumb where the shop serves it, else the path of the product's main category.
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
    const { storefrontClient, shopwareVersion, categoryRoots } = context;

    const loadProducts = async () => {
      const response = await storefrontClient.invoke('readProduct post /product', {
        body: {
          ids: entityIds,
          associations: {
            seoUrls: {},
          },
          includes: {
            product: ['id', 'name', 'translated', 'seoUrls'],
          },
        },
      });
      return response.data.elements ?? [];
    };

    /**
     * The category path of each product: Shopware's breadcrumb where it answers, else the product's
     * main category with its path. On a release without the route nothing waits for it, so the main
     * categories are read alongside the products.
     */
    const readPaths = async () => {
      const fromRoute = await readShopwareBreadcrumbs(storefrontClient, shopwareVersion, entityIds, 'product');
      const fallbackIds = entityIds.filter((_, index) => !fromRoute[index]);
      // One read per product: the detail route takes a single id.
      const mainCategories = await Promise.all(fallbackIds.map((id) => readProductMainCategory(storefrontClient, id)));
      return { fromRoute, mainCategories: new Map(fallbackIds.map((id, index) => [id, mainCategories[index]])) };
    };

    const [products, { fromRoute, mainCategories }] = await Promise.all([
      passthrough.get(productsFragmentToken) ?? loadProducts(),
      readPaths(),
    ]);

    const fromPath = await readTrailsOfPaths(
      storefrontClient,
      categoryRoots,
      [...mainCategories.values()].filter((category) => category !== undefined)
    );

    const categoryItemsOf = (product: ShopwareProduct): BreadcrumbItemData[] => {
      const route = fromRoute[entityIds.indexOf(product.id)];
      if (route) return toBreadcrumbItems(route);
      const mainCategory = mainCategories.get(product.id);
      return (mainCategory && fromPath.get(mainCategory.id)) || [];
    };

    const toEntity = ({ id, ...base }: BreadcrumbItemData, isCurrentPage: boolean) =>
      $entity({ id, base: () => ({ ...base, isCurrentPage }) });

    return {
      links: products
        .filter((rawProduct) => entityIds.includes(rawProduct.id))
        .map((rawProduct) => {
          const categoryItems = categoryItemsOf(rawProduct);

          const productItem: BreadcrumbItemData = {
            id: `breadcrumb:${rawProduct.id}`,
            name: swTranslated(rawProduct, 'name'),
            link: { type: 'reference', reference: { type: 'Product', slug: entitySlug(rawProduct), id: rawProduct.id } },
          };

          return {
            sourceId: rawProduct.id,
            entities: [...categoryItems.map((item) => toEntity(item, false)), toEntity(productItem, true)],
          };
        }),
    };
  },
});
