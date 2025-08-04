import { Money } from '@screeny05/ts-money';
import {
  ProductBase,
  ProductDescription,
  ProductFlags,
  ProductInfo,
  ProductMedia,
  ProductPrices,
  ProductSeo,
} from '@laioutr-core/canonical-types/entity/product';
import { defineShopwareComponentResolver } from '../../../action/defineShopwareAction';
import { FALLBACK_IMAGE } from '../../../const/fallbacks';
import { productToSlug } from '../../../shopware-helper/mappers/slugMapper';
import { mapMedia } from '../../../shopware-helper/mediaMapper';
import { swTranslated } from '../../../shopware-helper/swTranslated';

/** Add an empty association object to the shopware-request if the component is requested */
const addAssociation = (name: string, add: boolean) => (add ? { [name]: {} } : {});

export default defineShopwareComponentResolver({
  label: 'Shopware Product Connector',
  entityType: 'Product',
  provides: [ProductBase, ProductInfo, ProductPrices, ProductMedia, ProductFlags, ProductSeo, ProductDescription],
  resolve: async ({ entityIds, requestedComponents, context, $entity }) => {
    const swResponse = await context.storefrontClient.invoke('readProduct post /product', {
      body: {
        ids: entityIds,
        associations: {
          ...addAssociation('media', requestedComponents.includes(ProductMedia)),
        },
      },
    });

    const shopwareProducts = swResponse.data.elements ?? [];

    const entities = shopwareProducts.map((rawProduct) => {
      const mappedCover = rawProduct.cover?.media ? mapMedia(rawProduct.cover.media) : FALLBACK_IMAGE;

      return $entity({
        id: rawProduct.id,

        base: {
          name: swTranslated(rawProduct, 'name'),
          slug: productToSlug(rawProduct),
        },

        info: {
          cover: mappedCover,
          shortDescription: swTranslated(rawProduct, 'description'),
          brand: rawProduct.manufacturer?.translated?.name ?? rawProduct.manufacturer?.name,
        },

        description: swTranslated(rawProduct, 'description'),

        seo: {
          title: swTranslated(rawProduct, 'metaTitle'),
          description: swTranslated(rawProduct, 'metaDescription'),
        },

        media: () => {
          const mappedMedia = rawProduct.media?.map((image) => mapMedia(image.media)) ?? [];
          // Shopwares product.media does not include the cover, so we add it manually
          const allMedia = [mappedCover, ...mappedMedia];

          return {
            cover: mappedCover,
            media: allMedia,
            images: allMedia.filter((media) => media.type === 'image'),
          };
        },

        prices: () => {
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
        },

        flags: [] as any[],
      });
    });

    return { entities };
  },
  cache: {
    strategy: 'ttl',
    ttl: '1 day',
  },
});
