import { QueryWireRequestQueryLink } from '#orchestr/types';
import { ProductVariantsLink } from '@laioutr-core/canonical-types/ecommerce';
import { MediaIncludes } from '../const/includes';
import { ShopwareAssociationsQuery, ShopwareIncludesQuery } from '../types/shopware';

const unique = <T>(arr: T[]) => Array.from(new Set(arr));

/** Add an empty association object to the shopware-request if the component is requested */
const addAssociation = (name: string, add: boolean, association: ShopwareAssociationsQuery = {}) => (add ? { [name]: association } : {});

/** @deprecated Use resolveProductFields instead */
const _resolveRequestedFields = ({
  requestedComponents,
  requestedLinks,
}: {
  requestedComponents: string[];
  requestedLinks: Record<string, QueryWireRequestQueryLink>;
}) => {
  const requestedVariants = requestedLinks[ProductVariantsLink];
  const variantFields = requestedVariants ? resolveProductVariantFields() : undefined;

  const associations = {
    ...(requestedComponents.includes('media') ? { cover: { associations: { media: {} } }, media: { associations: { media: {} } } } : {}), // gallery images (via product_media -> media)
    ...(requestedComponents.includes('options') ? { options: { associations: { group: {} } } } : {}), // variant options like Color/Size + their group names

    ...(requestedVariants ?
      {
        children: {
          associations: variantFields?.associations ?? {},
        },
      }
    : {}),
  } as ShopwareAssociationsQuery;

  const includes = {
    product: unique([
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
      ...(variantFields?.includes?.product ?? []),
    ]),
    product_media: requestedComponents.includes('media') ? ['id', 'mediaId', 'media'] : [],
    media: requestedComponents.includes('media') ? MediaIncludes : [],
    property_group_option: requestedComponents.includes('availability') ? ['id', 'name', 'group'] : [],
    property_group: requestedComponents.includes('availability') ? ['id', 'name'] : [],
  } as ShopwareIncludesQuery;

  return { associations, includes };
};

const mergeIncludes = (includes1: ShopwareIncludesQuery, includes2: ShopwareIncludesQuery) => {
  const merged: ShopwareIncludesQuery = {};
  for (const [key, value] of Object.entries(includes1)) {
    merged[key] = [...value];
  }
  for (const [key, value] of Object.entries(includes2)) {
    merged[key] = [...(merged[key] ?? []), ...value];
  }
  for (const [key, value] of Object.entries(merged)) {
    merged[key] = unique([...value]);
  }
  return merged;
};

export const resolveProductFields = ({ loadVariants }: { loadVariants: boolean }) => {
  const variantFields = loadVariants ? resolveProductVariantFields() : undefined;

  const associations: ShopwareAssociationsQuery = {
    cover: { associations: { media: {} } },
    media: { associations: { media: {} } },
    ...addAssociation('children', loadVariants, variantFields?.associations ? { associations: variantFields?.associations } : {}),
  };

  const includes: ShopwareIncludesQuery = mergeIncludes(
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
      ],
      product_media: ['id', 'mediaId', 'media'],
      media: MediaIncludes,
    },
    variantFields?.includes ?? {}
  );

  return {
    associations,
    includes,
  };
};

export const resolveProductVariantFields = () => {
  const associations: ShopwareAssociationsQuery = {
    cover: { associations: { media: {} } }, // main image
    media: { associations: { media: {} } }, // gallery images (via product_media -> media)
    options: { associations: { group: {} } }, // variant options like Color/Size + their group names
    manufacturer: {},
    deliveryTime: {},
    prices: { associations: { rule: {} } },
  };

  const includes: ShopwareIncludesQuery = {
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
    ],
    product_media: ['id', 'mediaId', 'media'],
    media: MediaIncludes,
    property_group_option: ['id', 'name', 'group'],
    property_group: ['id', 'name'],
  };

  return {
    associations,
    includes,
  };
};
