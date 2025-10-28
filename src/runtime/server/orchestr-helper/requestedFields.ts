import { QueryWireRequestQueryLink } from '#orchestr/types';
import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { MediaIncludes } from '../const/includes';
import { ShopwareAssociationsQuery, ShopwareIncludesQuery } from '../types/shopware';

const eliminateDuplicates = (arr: unknown[]) => Array.from(new Set(arr));

export const resolveRequestedFields = ({
  requestedComponents,
  requestedLinks,
}: {
  requestedComponents: string[];
  requestedLinks: Record<string, QueryWireRequestQueryLink>;
}) => {
  const requestedVariants = requestedLinks[ProductVariantsLink];

  const associations = {
    ...(requestedComponents.includes('media') ? { cover: { associations: { media: {} } }, media: { associations: { media: {} } } } : {}), // gallery images (via product_media -> media)
    ...(requestedComponents.includes('options') ? { options: { associations: { group: {} } } } : {}), // variant options like Color/Size + their group names

    ...(requestedVariants ?
      {
        children: {
          associations: {
            // base → resolve option/group labels + cover media
            ...(requestedVariants?.components?.includes('base') ?
              {
                options: { associations: { group: {} } },
                cover: { associations: { media: {} } },
              }
            : {}),

            // info → manufacturer entity
            ...(requestedVariants?.components?.includes('info') ? { manufacturer: {} } : {}),

            ...(requestedVariants?.components?.includes('media') ?
              { cover: { associations: { media: {} } }, media: { associations: { media: {} } } }
            : {}), // gallery images (via product_media -> media)

            ...(requestedVariants?.components?.includes('options') ? { options: { associations: { group: {} } } } : {}), // variant options like Color/Size + their group names

            // shipping → deliveryTime entity
            ...(requestedVariants?.components?.includes('shipping') ? { deliveryTime: {} } : {}),

            // quantityPrices / quantityRule → product.prices[] (+rule if requested)
            ...(requestedVariants?.components?.includes('quantityPrices') || requestedVariants?.components?.includes('quantityRule') ?
              {
                prices: {
                  associations: requestedVariants?.components?.includes('quantityRule') ? { rule: {} } : {},
                },
              }
            : {}),
          },
        },
      }
    : {}),
  } as ShopwareAssociationsQuery;

  const includes = {
    product: eliminateDuplicates([
      'id',
      'parentId',
      ...(requestedComponents.includes('base') ? ['name', 'seoUrls'] : []),
      ...(requestedComponents.includes('info') ?
        ['name', 'productNumber', 'ean', 'translated', 'manufacturer', 'description', 'cover']
      : []),
      ...(requestedComponents.includes('description') ? ['translated', 'description'] : []),
      ...(requestedComponents.includes('seo') ? ['metaTitle', 'metaDescription', 'seoUrls'] : []),
      ...(requestedComponents.includes('media') ? ['cover', 'media'] : []),
      ...(requestedComponents.includes('prices') ?
        ['minPurchase', 'purchaseSteps', 'maxPurchase', 'calculatedPrice', 'calculatedPrices']
      : []),
      ...(requestedLinks['ecommerce/product/variants'] ? ['children'] : []),
    ]),
    product_media: requestedComponents.includes('media') ? ['id', 'mediaId', 'media'] : [],
    media: requestedComponents.includes('media') ? MediaIncludes : [],
    property_group_option: requestedComponents.includes('availability') ? ['id', 'name', 'group'] : [],
    property_group: requestedComponents.includes('availability') ? ['id', 'name'] : [],
  } as ShopwareIncludesQuery;

  return { associations, includes };
};
