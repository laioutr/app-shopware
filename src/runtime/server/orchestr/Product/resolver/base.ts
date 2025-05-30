import { Money } from '@screeny05/ts-money';
import {
  ProductAvailableVariants,
  ProductBase,
  ProductFlags,
  ProductInfo,
  ProductMedia,
  ProductPrices,
} from '@laioutr-core/canonical-types/orchestr/product';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';
import { FALLBACK_IMAGE } from '../../../const/fallbacks';
import { addComponent } from '../../../orchestr-helper/addComponent';
import { matchAndMap } from '../../../orchestr-helper/matchAndMap';
import { productToSlug } from '../../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../../shopware-helper/mediaMapper';
import { swTranslated } from '../../../shopware-helper/swTranslated';

const addAssociation = (name: string, add: boolean) => (add ? { [name]: {} } : {});

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductInfo, ProductPrices, ProductMedia, ProductFlags, ProductAvailableVariants],
  resolve: async ({ entityIds, requestedComponents, context }) => {
    const swResponse = await context.storefrontClient.invoke('readProduct post /product', {
      body: {
        ids: entityIds,
        associations: {
          ...addAssociation('media', requestedComponents.includes(ProductMedia.componentName)),
        },
      },
    });
    const shopwareProducts = swResponse.data.elements ?? [];

    return {
      componentData: matchAndMap(
        entityIds,
        shopwareProducts,
        (id, product) => product.id === id,
        (rawProduct) => {
          const mappedCover = rawProduct.cover?.media ? mapMedia(rawProduct.cover.media) : FALLBACK_IMAGE;

          return {
            ...addComponent(ProductBase, () => ({
              name: swTranslated(rawProduct, 'name'),
              sku: swTranslated(rawProduct, 'productNumber'),
              slug: productToSlug(rawProduct),
            })),

            ...addComponent(ProductInfo, () => ({
              cover: mappedCover,
              shortDescription: swTranslated(rawProduct, 'description'),
              brand: rawProduct.manufacturer?.translated?.name ?? rawProduct.manufacturer?.name,
            })),

            ...addComponent(ProductMedia, () => {
              const mappedMedia = rawProduct.media?.map((image) => mapMedia(image.media)) ?? [];
              // Shopwares product.media does not include the cover, so we add it manually
              const allMedia = [mappedCover, ...mappedMedia];

              return {
                cover: mappedCover,
                media: allMedia,
                images: allMedia.filter((media) => media.type === 'image'),
              };
            }),

            ...addComponent(ProductPrices, () => {
              const rawListPrice = rawProduct.calculatedCheapestPrice?.listPrice?.price ?? rawProduct.calculatedPrice.listPrice?.price;
              const listPrice = rawListPrice ? Money.fromDecimal(rawListPrice, context.swCurrency) : undefined;
              const totalPrice = Money.fromDecimal(
                rawProduct.calculatedCheapestPrice?.totalPrice ?? rawProduct.calculatedPrice.totalPrice,
                context.swCurrency
              );

              const hasSavings = typeof listPrice === 'object' && listPrice.greaterThan(totalPrice);

              const savingsPercent = hasSavings ? 100 - totalPrice.percentageOf(listPrice) : undefined;

              return {
                price: totalPrice,
                strikethroughPrice: hasSavings ? listPrice : undefined,
                savingsPercent,
                isOnSale: hasSavings,
                isStartingFrom: rawProduct.calculatedCheapestPrice?.hasRange || rawProduct.calculatedPrice.hasRange,
              };
            }),

            ...addComponent(ProductAvailableVariants, () => [] as any[]),
            ...addComponent(ProductFlags, () => [] as any[]),
          };
        }
      ),
    };
  },
  cache: {
    strategy: 'ttl',
    ttl: '1 day',
  },
});
