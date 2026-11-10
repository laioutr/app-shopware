import { ProductBreadcrumbLink } from '@laioutr-core/canonical-types/ecommerce';
import { BreadcrumbItemBase } from '@laioutr-core/canonical-types/entity/breadcrumb-item';
import type { ShopwareProduct } from '../../types/shopware';
import { productsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import {
  type BreadcrumbItemData,
  readCategoryTrails,
  readProductMainCategoryId,
  readShopwareBreadcrumbs,
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

    const [products, fromRoute] = await Promise.all([
      passthrough.get(productsFragmentToken) ?? loadProducts(),
      readShopwareBreadcrumbs(storefrontClient, shopwareVersion, entityIds, 'product'),
    ]);
    const routeOf = (productId: string) => fromRoute[entityIds.indexOf(productId)];

    const fallbackProducts = products.filter((product) => entityIds.includes(product.id) && !routeOf(product.id));
    const mainCategoryIds = new Map(
      await Promise.all(
        fallbackProducts.map(async (product) => [product.id, await readProductMainCategoryId(storefrontClient, product.id)] as const)
      )
    );
    const fromPath = await readCategoryTrails(storefrontClient, categoryRoots, [
      ...new Set([...mainCategoryIds.values()].filter((id): id is string => !!id)),
    ]);

    const categoryItemsOf = (product: ShopwareProduct): BreadcrumbItemData[] => {
      const route = routeOf(product.id);
      if (route) return toBreadcrumbItems(route);
      const mainCategoryId = mainCategoryIds.get(product.id);
      return (mainCategoryId && fromPath.get(mainCategoryId)) || [];
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
