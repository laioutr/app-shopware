import type { ResolveCriteria, ShopwareCriteria } from '../types/criteria';
import { MediaIncludes } from '../const/includes';
import { mergeIncludes } from '../shopware-helper/criteria';

export const resolveProductVariantFields = async (resolveCriteria: ResolveCriteria): Promise<ShopwareCriteria> =>
  resolveCriteria('product-variant', {
    associations: {
      cover: { associations: { media: {} } }, // main image
      media: { associations: { media: {} } }, // gallery images (via product_media -> media)
      options: { associations: { group: {} } }, // variant options like Color/Size + their group names
      manufacturer: {},
      deliveryTime: {},
      prices: { associations: { rule: {} } },
    },
    includes: {
      product: [
        'id',
        'parentId',
        'name',
        'productNumber',
        'ean',
        'available',
        'availableStock',
        'stock',
        'minPurchase',
        'purchaseSteps',
        'maxPurchase',
        'calculatedPrice',
        'calculatedPrices',
        'cover',
        'media',
        'options',
        'optionIds',
        'translated',
        'manufacturer',
        'deliveryTime',
        'prices',
        'ratingAverage',
        'productReviews',
      ],
      product_media: ['id', 'mediaId', 'media'],
      media: MediaIncludes,
      property_group_option: ['id', 'name', 'group', 'translated'],
      property_group: ['id', 'name', 'translated'],
    },
  });

export const resolveProductFields = async (resolveCriteria: ResolveCriteria): Promise<ShopwareCriteria> => {
  // A product without variants is its own variant: the variants link points at the product's own id
  // and the variant resolver reads that row straight out of this response, so the projection has to
  // carry the variant fields as well or availability and options come back empty.
  const variantFields = await resolveProductVariantFields(resolveCriteria);

  return resolveCriteria('product', {
    associations: {
      cover: { associations: { media: {} } },
      media: { associations: { media: {} } },
    },
    includes: mergeIncludes(
      {
        product: [
          'id',
          'parentId',
          'name',
          'seoUrls',
          'productNumber',
          'ean',
          'translated',
          'manufacturer',
          'description',
          'cover',
          'metaTitle',
          'metaDescription',
          'cover',
          'media',
          'minPurchase',
          'purchaseSteps',
          'maxPurchase',
          'calculatedPrice',
          'calculatedPrices',
          'ratingAverage',
          'productReviews',
        ],
        product_media: ['id', 'mediaId', 'media'],
        media: MediaIncludes,
      },
      variantFields.includes
    ),
  });
};
