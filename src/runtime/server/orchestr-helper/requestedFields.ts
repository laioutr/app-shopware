import type { ResolveCriteria, ShopwareCriteria } from '../types/criteria';
import type { ShopwareAssociationsQuery } from '../types/shopware';
import { MediaIncludes } from '../const/includes';
import { mergeIncludes } from '../shopware-helper/criteria';

/** Add an empty association object to the shopware-request if the component is requested */
const addAssociation = (name: string, add: boolean, association: ShopwareAssociationsQuery = {}) => (add ? { [name]: association } : {});

export const resolveProductFields = async (
  { loadVariants }: { loadVariants: boolean },
  resolveCriteria: ResolveCriteria
): Promise<ShopwareCriteria> => {
  const variantFields = loadVariants ? await resolveProductVariantFields(resolveCriteria) : undefined;

  return resolveCriteria('product', {
    associations: {
      cover: { associations: { media: {} } },
      media: { associations: { media: {} } },
      ...addAssociation('children', loadVariants, variantFields ? { associations: variantFields.associations } : {}),
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
          'children',
          'ratingAverage',
          'productReviews',
        ],
        product_media: ['id', 'mediaId', 'media'],
        media: MediaIncludes,
      },
      variantFields?.includes ?? {}
    ),
  });
};

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
