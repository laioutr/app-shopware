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
      // Only the parent carries the configurator, which is what defines the option
      // axes; `properties` on the same row are filterable facets and never do.
      // `media` needs its own association: without it the option's swatch image is
      // never returned, whatever the group's displayType claims.
      configuratorSettings: { associations: { option: { associations: { group: {}, media: {} } } } },
      // Only the variant projection's `includes` are merged below, never its
      // associations, so the selected options need associating here too or the
      // default variant reports none.
      options: { associations: { group: {} } },
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
          'configuratorSettings',
        ],
        product_media: ['id', 'mediaId', 'media'],
        media: MediaIncludes,
        product_configurator_setting: ['id', 'optionId', 'option', 'position'],
        // Merged with the variant projection's narrower list, which carries neither
        // the swatch fields nor the ordering the configurator is authored in.
        property_group_option: ['colorHexCode', 'media', 'position'],
        property_group: ['displayType', 'position'],
      },
      variantFields.includes
    ),
  });
};
