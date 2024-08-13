/* eslint-disable unicorn/filename-case */
/* eslint-disable prettier/prettier */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
type OneOf<T extends unknown[]> =
  T extends [infer Only] ? Only
  : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]>
  : never;
type GenericRecord = never | null | string | string[] | number | { [key: string]: GenericRecord };
export type components = {
  schemas: Schemas;
};
export type Schemas = {
  AccountNewsletterRecipientResult: {
    /** @enum {string} */
    apiAlias: 'account_newsletter_recipient';
    /** @enum {string} */
    status: 'undefined' | 'notSet' | 'direct' | 'optIn' | 'optOut';
  };
  AclRole: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  AggregationEntity: {
    /** The entity definition e.g "product_manufacturer". */
    definition: string;
    /** The field you want to aggregate over. */
    field: string;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: 'entity';
  };
  AggregationFilter: {
    filter: components['schemas']['Filters'][];
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: 'filter';
  };
  AggregationHistogram: {
    /** The field you want to aggregate over. */
    field: string;
    /** The format of the histogram */
    format?: string;
    /** The interval of the histogram */
    interval?: number;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** The timezone of the histogram */
    timeZone?: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: 'histogram';
  };
  AggregationMetrics: {
    field: string;
    name: string;
    /** @enum {string} */
    type: 'avg' | 'count' | 'max' | 'min' | 'stats' | 'sum';
  };
  AggregationRange: {
    /** The field you want to aggregate over. */
    field: string;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** The ranges of the aggregation */
    ranges: (
      | {
          /** The lower bound of the range */
          from: number;
          /** The upper bound of the range */
          to: number;
        }
      | {
          /** The lower bound of the range */
          from: string;
        }
      | {
          /** The upper bound of the range */
          to: string;
        }
    )[];
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: 'range';
  };
  AggregationTerms: {
    /** The field you want to aggregate over. */
    field: string;
    /** The number of terms to return */
    limit?: number;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** Sorting the aggregation result. */
    sort?: components['schemas']['Sort'][];
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: 'terms';
  };
  Aggregations: (
    | components['schemas']['AggregationMetrics']
    | (components['schemas']['AggregationEntity'] & components['schemas']['SubAggregations'])
    | (components['schemas']['AggregationFilter'] & components['schemas']['SubAggregations'])
    | (components['schemas']['AggregationTerms'] & components['schemas']['SubAggregations'])
    | (components['schemas']['AggregationHistogram'] & components['schemas']['SubAggregations'])
    | (components['schemas']['AggregationRange'] & components['schemas']['SubAggregations'])
  )[];
  App: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppActionButton: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppAdministrationSnippet: {
    appId: string;
    /** Format: date-time */
    createdAt: string;
    id?: string;
    localeId: string;
    /** Format: date-time */
    updatedAt?: string;
    value: string;
  };
  AppCmsBlock: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppFlowAction: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppFlowEvent: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppPaymentMethod: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppScriptCondition: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppShippingMethod: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  AppTemplate: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ArrayStruct: components['schemas']['Struct'];
  Association: {
    [key: string]: components['schemas']['Association'];
  };
  CalculatedPrice: {
    /** @enum {string} */
    apiAlias: 'calculated_price';
    calculatedTaxes: {
      /** @enum {string} */
      apiAlias: 'cart_tax_calculated';
      price: number;
      tax: number;
      taxRate: number;
    }[];
    hasRange: boolean;
    listPrice: components['schemas']['ListPrice'] | null;
    netPrice: number;
    positionPrice: number;
    quantity: number;
    rawTotal: number;
    referencePrice: components['schemas']['ReferencePrice'] | null;
    regulationPrice: {
      /** @enum {string} */
      apiAlias?: 'cart_regulation_price';
      price?: number;
    } | null;
    /** Currently active tax rules and/or rates */
    taxRules?: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    /** @enum {string} */
    taxStatus: 'net' | 'tax-free';
    totalPrice: number;
    unitPrice: number;
    /** Format: ^[0-9a-f]{32}$ */
    variantId?: string | null;
  };
  Cart: {
    /** An affiliate tracking code */
    affiliateCode?: string | null;
    /** @enum {string} */
    apiAlias: 'cart';
    /** A campaign tracking code */
    campaignCode?: string | null;
    /** A comment that can be added to the cart. */
    customerComment?: string | null;
    deliveries?: components['schemas']['CartDelivery'][];
    /** A list of all cart errors, such as insufficient stocks, invalid addresses or vouchers. */
    errors?:
      | components['schemas']['CartError'][]
      | {
          [key: string]: {
            code: number;
            key: string;
            level: number;
            message: string;
            messageKey: string;
          };
        };
    /** All items within the cart */
    lineItems?: components['schemas']['LineItem'][];
    modified?: boolean;
    /** Name of the cart - for example `guest-cart` */
    name?: string;
    price: components['schemas']['CalculatedPrice'];
    /** Context token identifying the cart and the user session */
    token?: string;
    /** A list of all payment transactions associated with the current cart. */
    transactions?: {
      amount?: components['schemas']['CalculatedPrice'];
      paymentMethodId?: string;
    }[];
  };
  CartDelivery: {
    deliveryDate?: {
      /** Format: date-time */
      earliest?: string;
      /** Format: date-time */
      latest?: string;
    };
    location?: {
      address?: components['schemas']['CustomerAddress'];
      /** @enum {string} */
      apiAlias?: 'cart_delivery_shipping_location';
      country?: components['schemas']['Country'];
      state?: components['schemas']['CountryState'];
    };
    positions?: components['schemas']['CartDeliveryPosition'][];
    shippingCosts?: components['schemas']['CalculatedPrice'];
    shippingMethod?: components['schemas']['ShippingMethod'];
  };
  CartDeliveryPosition: {
    deliveryDate?: {
      /** Format: date-time */
      earliest?: string;
      /** Format: date-time */
      latest?: string;
    };
    identifier?: string;
    lineItem?: components['schemas']['LineItem'];
    price?: components['schemas']['CalculatedPrice'];
  };
  CartError: {
    key: string;
    /**
     * * `0` - notice,
     * * `10` - warning,
     * * `20` - error
     * @enum {number}
     */
    level: 0 | 10 | 20;
    message: string;
    messageKey: string;
  };
  CartItems: {
    items?: components['schemas']['LineItem'][];
  };
  Category: {
    active?: boolean;
    afterCategoryId?: string;
    afterCategoryVersionId?: string;
    /** @enum {string} */
    apiAlias: 'category';
    breadcrumb: string[];
    /** Format: int64 */
    childCount: number;
    children: components['schemas']['Category'][];
    cmsPage?: components['schemas']['CmsPage'];
    cmsPageId?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    cmsPageIdSwitched?: boolean;
    cmsPageVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customEntityTypeId?: string;
    customFields?: GenericRecord;
    description?: string;
    displayNestedProducts: boolean;
    externalLink?: string;
    id: string;
    internalLink?: string;
    keywords?: string;
    /** Format: int64 */
    level?: number;
    linkNewTab?: boolean;
    linkType?: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    parent?: components['schemas']['Category'];
    parentId?: string;
    parentVersionId?: string;
    path?: string;
    productAssignmentType: string;
    seoUrls?: components['schemas']['SeoUrl'][];
    tags?: components['schemas']['Tag'][];
    translated: {
      afterCategoryId?: string;
      afterCategoryVersionId?: string;
      apiAlias?: string;
      breadcrumb: string[];
      cmsPageId?: string;
      cmsPageVersionId?: string;
      customEntityTypeId?: string;
      description?: string;
      externalLink?: string;
      internalLink?: string;
      keywords?: string;
      linkType?: string;
      mediaId?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      parentId?: string;
      parentVersionId?: string;
      path?: string;
      productAssignmentType?: string;
      type?: string;
      versionId?: string;
    };
    type: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
    visible?: boolean;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    visibleChildCount?: number;
  };
  CategoryJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    afterCategoryId?: string;
    afterCategoryVersionId?: string;
    breadcrumb?: readonly GenericRecord[];
    /** Format: int64 */
    childCount?: number;
    cmsPageId?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    cmsPageIdSwitched?: boolean;
    cmsPageVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customEntityTypeId?: string;
    customFields?: GenericRecord;
    description?: string;
    displayNestedProducts: boolean;
    externalLink?: string;
    id: string;
    internalLink?: string;
    keywords?: string;
    /** Format: int64 */
    level?: number;
    linkNewTab?: boolean;
    linkType?: string;
    mediaId?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    parentId?: string;
    parentVersionId?: string;
    path?: string;
    productAssignmentType: string;
    relationships?: {
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/children
           */
          related?: string;
        };
      };
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/cmsPage
           */
          related?: string;
        };
      };
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/media
           */
          related?: string;
        };
      };
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example category */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/parent
           */
          related?: string;
        };
      };
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/seoUrls
           */
          related?: string;
        };
      };
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/tags
           */
          related?: string;
        };
      };
    };
    translated?: {
      afterCategoryId?: string;
      afterCategoryVersionId?: string;
      cmsPageId?: string;
      cmsPageVersionId?: string;
      customEntityTypeId?: string;
      description?: string;
      externalLink?: string;
      internalLink?: string;
      keywords?: string;
      linkType?: string;
      mediaId?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      parentId?: string;
      parentVersionId?: string;
      path?: string;
      productAssignmentType?: string;
      type?: string;
      versionId?: string;
    };
    type: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
    visible?: boolean;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    visibleChildCount?: number;
  };
  CmsBlock: {
    /** @enum {string} */
    apiAlias: 'cms_block';
    backgroundColor?: string;
    backgroundMedia?: components['schemas']['Media'];
    backgroundMediaId?: string;
    backgroundMediaMode?: string;
    cmsSectionVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    cssClass?: string;
    customFields?: GenericRecord;
    id?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    marginTop?: string;
    name?: string;
    /** Format: int64 */
    position: number;
    sectionId: string;
    sectionPosition?: string;
    slots: components['schemas']['CmsSlot'][];
    type: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
    visibility?: {
      desktop?: boolean;
      mobile?: boolean;
      tablet?: boolean;
    };
  };
  CmsPage: {
    /** @enum {string} */
    apiAlias: 'cms_page';
    config?: {
      backgroundColor?: string;
    };
    /** Format: date-time */
    createdAt: string;
    cssClass?: string;
    customFields?: GenericRecord;
    entity?: string;
    id: string;
    landingPages?: components['schemas']['LandingPage'][];
    name?: string;
    previewMedia?: components['schemas']['Media'];
    previewMediaId?: string;
    sections: components['schemas']['CmsSection'][];
    translated?: {
      apiAlias?: string;
      cssClass?: string;
      entity?: string;
      name?: string;
      previewMediaId?: string;
      type?: string;
      versionId?: string;
    };
    type: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  CmsSection: {
    /** @enum {string} */
    apiAlias: 'cms_section';
    backgroundColor?: string;
    backgroundMedia?: components['schemas']['Media'];
    backgroundMediaId?: string;
    backgroundMediaMode?: string;
    blocks: components['schemas']['CmsBlock'][];
    cmsPageVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    cssClass?: string;
    customFields?: GenericRecord;
    id?: string;
    mobileBehavior?: string;
    name?: string;
    page?: components['schemas']['CmsPage'];
    pageId: string;
    /** Format: int64 */
    position: number;
    sizingMode?: string;
    /** @enum {string} */
    type: 'default' | 'sidebar';
    /** Format: date-time */
    updatedAt?: string;
    visibility?: {
      desktop?: boolean;
      mobile?: boolean;
      tablet?: boolean;
    };
  };
  CmsSlot: {
    /** @enum {string} */
    apiAlias: 'cms_slot';
    block?: components['schemas']['CmsBlock'];
    blockId: string;
    cmsBlockVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    fieldConfig?: GenericRecord;
    id: string;
    locked?: boolean;
    slot: string;
    translated?: {
      apiAlias?: string;
      blockId?: string;
      cmsBlockVersionId?: string;
      slot?: string;
      type?: string;
      versionId?: string;
    };
    type: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  Country: {
    active?: boolean;
    addressFormat: GenericRecord;
    advancedPostalCodePattern?: string;
    checkAdvancedPostalCodePattern?: boolean;
    checkPostalCodePattern?: boolean;
    checkVatIdPattern?: boolean;
    companyTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    /** Format: date-time */
    createdAt: string;
    customerTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    customFields?: GenericRecord;
    defaultPostalCodePattern?: string;
    displayStateInRegistration?: boolean;
    forceStateInRegistration?: boolean;
    id: string;
    iso?: string;
    iso3?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    postalCodeRequired?: boolean;
    shippingAvailable?: boolean;
    states?: components['schemas']['CountryState'][];
    translated?: {
      advancedPostalCodePattern?: string;
      defaultPostalCodePattern?: string;
      iso?: string;
      iso3?: string;
      name?: string;
      vatIdPattern?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    vatIdPattern?: string;
    vatIdRequired?: boolean;
  };
  CountryJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    addressFormat: GenericRecord;
    advancedPostalCodePattern?: string;
    checkAdvancedPostalCodePattern?: boolean;
    checkPostalCodePattern?: boolean;
    checkVatIdPattern?: boolean;
    companyTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    /** Format: date-time */
    createdAt: string;
    customerTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    customFields?: GenericRecord;
    defaultPostalCodePattern?: string;
    displayStateInRegistration?: boolean;
    forceStateInRegistration?: boolean;
    id: string;
    iso?: string;
    iso3?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    postalCodeRequired?: boolean;
    relationships?: {
      states?: {
        data?: {
          /** @example 34d955a0df5f7af9c9b4e4dccb3c3564 */
          id?: string;
          /** @example country_state */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /country/59716c97497eb9694541f7c3d37b1a4d/states
           */
          related?: string;
        };
      };
    };
    shippingAvailable?: boolean;
    translated?: {
      advancedPostalCodePattern?: string;
      defaultPostalCodePattern?: string;
      iso?: string;
      iso3?: string;
      name?: string;
      vatIdPattern?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    vatIdPattern?: string;
    vatIdRequired?: boolean;
  };
  CountryState: {
    active?: boolean;
    countryId: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /** Format: int64 */
    position?: number;
    shortCode: string;
    translated?: {
      countryId?: string;
      name?: string;
      shortCode?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  CountryStateJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    countryId: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /** Format: int64 */
    position?: number;
    shortCode: string;
    translated?: {
      countryId?: string;
      name?: string;
      shortCode?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  Criteria: {
    aggregations?: components['schemas']['Aggregations'];
    /** Associations to include. For more information, see [Search Queries > Associations](https://shopware.stoplight.io/docs/store-api/cf710bf73d0cd-search-queries#associations) */
    associations?: components['schemas']['Association'];
    /** Fields which should be returned in the search result. */
    fields?: string[];
    /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
    filter?: (
      | components['schemas']['SimpleFilter']
      | components['schemas']['EqualsFilter']
      | components['schemas']['MultiNotFilter']
      | components['schemas']['RangeFilter']
    )[];
    /** Perform groupings over certain fields */
    grouping?: string[];
    /** List of ids to search for */
    ids?: string[];
    includes?: components['schemas']['Include'];
    /** Number of items per result page */
    limit?: number;
    /** Search result page */
    page?: number;
    /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
    'post-filter'?: (
      | components['schemas']['SimpleFilter']
      | components['schemas']['EqualsFilter']
      | components['schemas']['MultiNotFilter']
      | components['schemas']['RangeFilter']
    )[];
    /** The query string to search for */
    query?: string;
    /** Sorting in the search result. */
    sort?: components['schemas']['Sort'][];
    /** Search term */
    term?: string;
    'total-count-mode'?: components['schemas']['TotalCountMode'];
  };
  CrossSellingElement: {
    /** @enum {string} */
    apiAlias: 'cross_selling_element';
    crossSelling: components['schemas']['ProductCrossSelling'];
    products: components['schemas']['Product'][];
    /** Format: uuid */
    streamId?: string;
    /** Format: int32 */
    total: number;
  };
  CrossSellingElementCollection: components['schemas']['CrossSellingElement'][];
  Currency: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Format: float */
    factor: number;
    id: string;
    isoCode: string;
    /** Runtime field, cannot be used as part of the criteria. */
    isSystemDefault?: boolean;
    itemRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    name: string;
    /** Format: int64 */
    position?: number;
    shortName: string;
    symbol: string;
    /** Format: float */
    taxFreeFrom?: number;
    totalRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    translated?: {
      isoCode?: string;
      name?: string;
      shortName?: string;
      symbol?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  CurrencyCountryRounding: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CurrencyJsonApi: components['schemas']['resource'] & {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Format: float */
    factor: number;
    id: string;
    isoCode: string;
    /** Runtime field, cannot be used as part of the criteria. */
    isSystemDefault?: boolean;
    itemRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    name: string;
    /** Format: int64 */
    position?: number;
    shortName: string;
    symbol: string;
    /** Format: float */
    taxFreeFrom?: number;
    totalRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    translated?: {
      isoCode?: string;
      name?: string;
      shortName?: string;
      symbol?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomEntity: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomField: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomFieldSet: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomFieldSetRelation: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Customer: {
    accountType: string;
    active?: boolean;
    activeBillingAddress: components['schemas']['CustomerAddress'];
    activeShippingAddress: components['schemas']['CustomerAddress'];
    addresses?: components['schemas']['CustomerAddress'][];
    affiliateCode?: string;
    /** @enum {string} */
    apiAlias?: 'customer';
    birthday?: string;
    campaignCode?: string;
    company?: string;
    /** Format: date-time */
    createdAt: string;
    createdById?: string;
    customerNumber: string;
    customFields?: GenericRecord;
    defaultBillingAddress?: components['schemas']['CustomerAddress'];
    defaultBillingAddressId: string;
    defaultPaymentMethod?: components['schemas']['PaymentMethod'];
    defaultPaymentMethodId: string;
    defaultShippingAddress?: components['schemas']['CustomerAddress'];
    defaultShippingAddressId: string;
    /** Format: date-time */
    doubleOptInConfirmDate?: string;
    /** Format: date-time */
    doubleOptInEmailSentDate?: string;
    doubleOptInRegistration?: boolean;
    email: string;
    /** Format: date-time */
    firstLogin?: string;
    firstName: string;
    group?: components['schemas']['CustomerGroup'];
    groupId: string;
    guest?: boolean;
    hash?: string;
    id: string;
    language?: components['schemas']['Language'];
    languageId: string;
    /** Format: date-time */
    lastLogin?: string;
    lastName: string;
    /** Format: date-time */
    lastOrderDate?: string;
    lastPaymentMethod?: components['schemas']['PaymentMethod'];
    lastPaymentMethodId?: string;
    /** Format: int64 */
    orderCount?: number;
    /** Format: float */
    orderTotalAmount?: number;
    /** Format: int64 */
    reviewCount?: number;
    salesChannelId: string;
    salutation?: components['schemas']['Salutation'];
    salutationId?: string;
    tagIds?: readonly string[];
    tags?: components['schemas']['Tag'][];
    title?: string;
    /** Format: date-time */
    updatedAt?: string;
    updatedById?: string;
    vatIds?: string[];
  };
  CustomerAddress: {
    additionalAddressLine1?: string;
    additionalAddressLine2?: string;
    city: string;
    company?: string;
    country?: components['schemas']['Country'];
    countryId: string;
    countryState?: components['schemas']['CountryState'];
    countryStateId?: string;
    /** Format: date-time */
    createdAt: string;
    customerId: string;
    customFields?: GenericRecord;
    department?: string;
    firstName: string;
    id: string;
    lastName: string;
    phoneNumber?: string;
    salutation?: components['schemas']['Salutation'];
    salutationId?: string;
    street: string;
    title?: string;
    /** Format: date-time */
    updatedAt?: string;
    zipcode?: string;
  };
  CustomerAddressBody: {
    additionalAddressLine1?: string;
    additionalAddressLine2?: string;
    city: string;
    company?: string;
    country?: components['schemas']['Country'];
    countryId: string;
    countryState?: components['schemas']['CountryState'];
    countryStateId?: string;
    customFields?: GenericRecord;
    department?: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    salutation?: components['schemas']['Salutation'];
    salutationId?: string;
    street: string;
    title?: string;
    zipcode?: string;
  };
  CustomerAddressRead: {
    country: components['schemas']['Country'];
    countryState?: components['schemas']['CountryState'];
    /** Format: date-time */
    createdAt: string;
    customerId: string;
    id?: string;
    salutation: components['schemas']['Salutation'];
    /** Format: date-time */
    updatedAt: string | null;
  };
  CustomerGroup: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    displayGross?: boolean;
    id: string;
    name: string;
    registrationActive?: boolean;
    registrationIntroduction?: string;
    registrationOnlyCompanyRegistration?: boolean;
    registrationSeoMetaDescription?: string;
    registrationTitle?: string;
    translated: {
      name?: string;
      registrationIntroduction?: string;
      registrationSeoMetaDescription?: string;
      registrationTitle?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomerRecovery: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomerTag: {
    customerId: string;
    id?: string;
    tag?: components['schemas']['Tag'];
    tagId: string;
  };
  CustomerWishlist: {
    /** Format: date-time */
    createdAt: string;
    customerId: string;
    customFields?: GenericRecord;
    id: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  CustomerWishlistProduct: {
    /** Format: date-time */
    createdAt: string;
    id: string;
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  DeliveryInformation: {
    /** @enum {string} */
    apiAlias?: 'cart_delivery_information';
    deliveryTime?: {
      /** @enum {string} */
      apiAlias?: 'cart_delivery_time';
      max?: number;
      min?: number;
      name?: string;
      unit?: string;
    };
    freeDelivery?: boolean;
    height?: number;
    length?: number;
    restockTime?: number;
    stock: number;
    weight?: number;
    width?: number;
  };
  DeliveryTime: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    /** Format: int64 */
    max: number;
    /** Format: int64 */
    min: number;
    name: string;
    translated?: {
      name?: string;
      unit?: string;
    };
    unit: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Document: {
    config: {
      name: string;
      title: string;
    };
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    deepLinkCode: string;
    dependentDocuments?: components['schemas']['Document'][];
    documentMediaFile?: components['schemas']['Media'];
    documentMediaFileId?: string;
    documentNumber?: string;
    documentType?: components['schemas']['DocumentType'];
    documentTypeId: string;
    fileType: string;
    id: string;
    order?: components['schemas']['Order'];
    orderId: string;
    orderVersionId?: string;
    referencedDocument?: components['schemas']['Document'];
    referencedDocumentId?: string;
    sent?: boolean;
    static?: boolean;
    /** Format: date-time */
    updatedAt?: string;
  };
  DocumentBaseConfig: {
    config?: GenericRecord;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    documentNumber?: string;
    documentTypeId: string;
    filenamePrefix?: string;
    filenameSuffix?: string;
    global: boolean;
    id: string;
    logo?: components['schemas']['Media'];
    logoId?: string;
    name: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  DocumentBaseConfigSalesChannel: {
    /** Format: date-time */
    createdAt: string;
    documentBaseConfigId: string;
    documentTypeId?: string;
    id: string;
    salesChannelId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  DocumentType: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    technicalName: string;
    translated?: {
      name?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  EntitySearchResult: components['schemas']['ArrayStruct'] & {
    /** Contains aggregated data. A simple example is the determination of the average price from a product search query. */
    aggregations?: GenericRecord[];
    entity?: string;
    /** The actual limit. This is used for pagination and goes together with the page. */
    limit?: number;
    /** The actual page. This can be used for pagination. */
    page?: number;
    /** The total number of found entities */
    total?: number;
  };
  EqualsFilter: {
    field: string;
    /** @enum {string} */
    type: 'equals';
    value: string | number | boolean | null;
  };
  Filters: (
    | components['schemas']['SimpleFilter']
    | components['schemas']['EqualsFilter']
    | components['schemas']['MultiNotFilter']
    | components['schemas']['RangeFilter']
  )[];
  FindProductVariantRouteResponse: {
    foundCombination?: {
      options?: string[];
      variantId?: string;
    };
  };
  Flow: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  FlowSequence: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  FlowTemplate: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ImportExportFile: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ImportExportLog: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ImportExportProfile: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  Include: {
    [key: string]: string[];
  };
  Integration: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  LandingPage: {
    active?: boolean;
    /** @enum {string} */
    apiAlias: 'landing_page';
    cmsPage?: components['schemas']['CmsPage'];
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    keywords?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    seoUrls?: components['schemas']['SeoUrl'][];
    slotConfig?: GenericRecord;
    translated?: {
      apiAlias?: string;
      cmsPageId?: string;
      cmsPageVersionId?: string;
      keywords?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      url?: string;
      versionId?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    url: string;
    versionId?: string;
  };
  LandingPageJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    keywords?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    relationships?: {
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /landing-page/815c27537bec3b60c50a2ae4d2ce875d/cmsPage
           */
          related?: string;
        };
      };
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /landing-page/815c27537bec3b60c50a2ae4d2ce875d/seoUrls
           */
          related?: string;
        };
      };
    };
    slotConfig?: GenericRecord;
    translated?: {
      cmsPageId?: string;
      cmsPageVersionId?: string;
      keywords?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      url?: string;
      versionId?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    url: string;
    versionId?: string;
  };
  Language: {
    children?: components['schemas']['Language'][];
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    locale?: components['schemas']['Locale'];
    localeId: string;
    name: string;
    parent?: components['schemas']['Language'];
    parentId?: string;
    translationCode?: components['schemas']['Locale'];
    translationCodeId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  LanguageJsonApi: components['schemas']['resource'] & {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    localeId: string;
    name: string;
    parentId?: string;
    relationships?: {
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example language */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/children
           */
          related?: string;
        };
      };
      locale?: {
        data?: {
          /** @example fb216d9e8791e63c8d12bdc420956839 */
          id?: string;
          /** @example locale */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/locale
           */
          related?: string;
        };
      };
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example language */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/parent
           */
          related?: string;
        };
      };
      translationCode?: {
        data?: {
          /** @example 6ef2035242b8fcb7b61c3a41850e60b3 */
          id?: string;
          /** @example locale */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/translationCode
           */
          related?: string;
        };
      };
    };
    translationCodeId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  LineItem: {
    children?: components['schemas']['LineItem'][];
    cover?: components['schemas']['ProductMedia'];
    dataContextHash?: string;
    dataTimestamp?: string;
    deliveryInformation: components['schemas']['DeliveryInformation'];
    description?: string;
    good?: boolean;
    id: string;
    label?: string;
    modified?: boolean;
    modifiedByApp?: boolean;
    payload: components['schemas']['ProductJsonApi'];
    price?: {
      /** @enum {string} */
      apiAlias: 'calculated_price';
      calculatedTaxes?: {
        /** @enum {string} */
        apiAlias: 'cart_tax_calculated';
        price: number;
        tax: number;
        taxRate: number;
      }[];
      listPrice?: components['schemas']['ListPrice'] | null;
      quantity: number;
      referencePrice?: components['schemas']['ReferencePrice'] | null;
      regulationPrice?: {
        /** @enum {string} */
        apiAlias?: 'cart_regulation_price';
        price?: number;
      } | null;
      /** Currently active tax rules and/or rates */
      taxRules?: {
        name?: string;
        /** Format: float */
        taxRate?: number;
      }[];
      totalPrice: number;
      unitPrice: number;
    };
    priceDefinition?: components['schemas']['PriceDefinition'];
    quantity: number;
    quantityInformation?: {
      maxPurchase?: number;
      minPurchase?: number;
      purchaseSteps?: number;
    };
    referencedId?: string;
    removable?: boolean;
    stackable?: boolean;
    states: ('is-physical' | 'is-download')[];
    type: components['schemas']['LineItemType'];
    uniqueIdentifier?: string;
  };
  LineItemType: 'product' | 'credit' | 'custom' | 'promotion' | 'discount' | 'container' | 'quantity';
  ListPrice: {
    /** @enum {string} */
    apiAlias: 'cart_list_price';
    discount?: number;
    percentage?: number;
    price?: number;
  };
  Locale: {
    code: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    territory: string;
    translated?: {
      code?: string;
      name?: string;
      territory?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  LogEntry: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  MailHeaderFooter: {
    /** Format: date-time */
    createdAt: string;
    description?: string;
    footerHtml?: string;
    footerPlain?: string;
    headerHtml?: string;
    headerPlain?: string;
    id?: string;
    name: string;
    systemDefault?: boolean;
    translated?: {
      description?: string;
      footerHtml?: string;
      footerPlain?: string;
      headerHtml?: string;
      headerPlain?: string;
      name?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  MailTemplate: {
    contentHtml: string;
    contentPlain: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    mailTemplateType?: components['schemas']['MailTemplateType'];
    media?: components['schemas']['MailTemplateMedia'][];
    senderName?: string;
    systemDefault?: boolean;
    translated?: {
      contentHtml?: string;
      contentPlain?: string;
      senderName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  MailTemplateMedia: {
    id: string;
    languageId: string;
    mailTemplateId: string;
    media?: components['schemas']['Media'];
    mediaId: string;
    /** Format: int64 */
    position?: number;
  };
  MailTemplateType: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    technicalName: string;
    translated?: {
      name?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  MainCategory: {
    categoryId: string;
    categoryVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    id: string;
    productId: string;
    productVersionId?: string;
    salesChannelId: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  MainCategoryJsonApi: components['schemas']['resource'] & {
    categoryId: string;
    categoryVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    id: string;
    productId: string;
    productVersionId?: string;
    salesChannelId: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Media: {
    alt?: string;
    /** @enum {string} */
    apiAlias: 'media';
    config?: GenericRecord;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    fileExtension: string;
    fileName: string;
    /** Format: int64 */
    fileSize?: number;
    /** Runtime field, cannot be used as part of the criteria. */
    hasFile: boolean;
    id: string;
    metaData?: {
      /** Format: int64 */
      height?: number;
      /** Format: int64 */
      width?: number;
    };
    mimeType?: string;
    path: string;
    private: boolean;
    thumbnails?: components['schemas']['MediaThumbnail'][];
    title?: string;
    translated?: {
      alt?: string;
      apiAlias?: string;
      fileExtension?: string;
      fileName?: string;
      mimeType?: string;
      path?: string;
      title?: string;
      uploadedAt?: string;
      url?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    /** Format: date-time */
    uploadedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url: string;
  };
  MediaDefaultFolder: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  MediaFolder: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  MediaFolderConfiguration: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  MediaTag: {
    id?: string;
    media?: components['schemas']['Media'];
    mediaId: string;
    tag?: components['schemas']['Tag'];
    tagId: string;
  };
  MediaThumbnail: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Format: int64 */
    height: number;
    id: string;
    mediaId: string;
    path?: string;
    /** Format: date-time */
    updatedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url: string;
    /** Format: int64 */
    width: number;
  };
  MediaThumbnailSize: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Format: int64 */
    height: number;
    id: string;
    /** Format: date-time */
    updatedAt?: string;
    /** Format: int64 */
    width: number;
  };
  MultiNotFilter: {
    /** @enum {string} */
    operator: 'AND' | 'and' | 'OR' | 'or';
    queries: components['schemas']['Filters'];
    /** @enum {string} */
    type: 'multi' | 'not';
  };
  NavigationRouteResponse: components['schemas']['Category'][];
  NavigationType: 'main-navigation' | 'footer-navigation' | 'service-navigation';
  NewsletterRecipient: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  NewsletterRecipientJsonApi: components['schemas']['resource'] & {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Notification: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  NumberRange: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  NumberRangeSalesChannel: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  NumberRangeState: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  NumberRangeType: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  Order: {
    addresses?: components['schemas']['OrderAddress'][];
    affiliateCode?: string;
    /** Format: float */
    amountNet?: number;
    /** Format: float */
    amountTotal?: number;
    billingAddress?: components['schemas']['OrderAddress'];
    billingAddressId: string;
    billingAddressVersionId?: string;
    campaignCode?: string;
    /** Format: date-time */
    createdAt: string;
    createdById?: string;
    currency?: components['schemas']['Currency'];
    /** Format: float */
    currencyFactor: number;
    currencyId: string;
    customerComment?: string;
    customFields?: GenericRecord;
    deepLinkCode?: string;
    deliveries?: components['schemas']['OrderDelivery'][];
    documents: components['schemas']['Document'][];
    id: string;
    language?: components['schemas']['Language'];
    languageId: string;
    lineItems?: components['schemas']['OrderLineItem'][];
    orderCustomer?: components['schemas']['OrderCustomer'];
    orderDate: string;
    /** Format: date-time */
    orderDateTime: string;
    orderNumber?: string;
    /** Format: float */
    positionPrice?: number;
    price: components['schemas']['CalculatedPrice'];
    salesChannelId: string;
    shippingCosts?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: float */
    shippingTotal?: number;
    source?: string;
    stateMachineState: components['schemas']['StateMachineState'];
    tags?: components['schemas']['Tag'][];
    taxStatus?: string;
    transactions?: components['schemas']['OrderTransaction'][];
    /** Format: date-time */
    updatedAt?: string;
    updatedById?: string;
    versionId?: string;
  };
  OrderAddress: {
    additionalAddressLine1?: string;
    additionalAddressLine2?: string;
    city: string;
    company?: string;
    country?: components['schemas']['Country'];
    countryId: string;
    countryState?: components['schemas']['CountryState'];
    countryStateId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    department?: string;
    firstName: string;
    id: string;
    lastName: string;
    phoneNumber?: string;
    salutation?: components['schemas']['Salutation'];
    street: string;
    title?: string;
    /** Format: date-time */
    updatedAt?: string;
    vatId?: string;
    versionId?: string;
    zipcode?: string;
  };
  OrderCustomer: {
    company?: string;
    /** Format: date-time */
    createdAt: string;
    customerNumber?: string;
    customFields?: GenericRecord;
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    salutation?: components['schemas']['Salutation'];
    salutationId?: string;
    title?: string;
    /** Format: date-time */
    updatedAt?: string;
    vatIds?: string[];
    versionId?: string;
  };
  OrderDelivery: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    orderId: string;
    orderVersionId?: string;
    positions?: components['schemas']['OrderDeliveryPosition'][];
    shippingCosts?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: date-time */
    shippingDateEarliest: string;
    /** Format: date-time */
    shippingDateLatest: string;
    shippingMethod?: components['schemas']['ShippingMethod'];
    shippingMethodId: string;
    shippingOrderAddress?: components['schemas']['OrderAddress'];
    shippingOrderAddressId: string;
    shippingOrderAddressVersionId?: string;
    stateId: string;
    stateMachineState?: components['schemas']['StateMachineState'];
    trackingCodes: string[];
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderDeliveryPosition: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    orderDeliveryId: string;
    orderDeliveryVersionId?: string;
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    price?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: int64 */
    quantity?: number;
    /** Format: float */
    totalPrice?: number;
    /** Format: float */
    unitPrice?: number;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderLineItem: {
    /** @enum {string} */
    apiAlias?: 'order_line_item';
    children: components['schemas']['OrderLineItem'][];
    cover?: components['schemas']['Media'];
    coverId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    downloads?: components['schemas']['OrderLineItemDownload'][];
    extensions?: GenericRecord;
    good?: boolean;
    id: string;
    identifier: string;
    label: string;
    orderDeliveryPositions?: components['schemas']['OrderDeliveryPosition'][];
    orderId: string;
    orderVersionId?: string;
    parent?: components['schemas']['OrderLineItem'];
    parentId?: string;
    parentVersionId?: string;
    payload?: {
      categoryIds?: readonly string[];
      /** Format: date-time */
      createdAt?: string;
      customFields?: GenericRecord;
      features?: unknown[];
      isCloseout?: boolean;
      isNew?: boolean;
      manufacturerId?: string;
      markAsTopseller?: boolean;
      optionIds?: readonly string[];
      options?: components['schemas']['PropertyGroupOption'][];
      parentId?: string;
      productNumber?: string;
      propertyIds?: readonly string[];
      purchasePrices?: string;
      /** Format: date-time */
      releaseDate?: string;
      /** Format: int64 */
      stock?: number;
      streamIds?: readonly string[];
      tagIds?: readonly string[];
      taxId?: string;
    };
    /** Format: int64 */
    position: number;
    priceDefinition?: components['schemas']['PriceDefinition'];
    productId?: string;
    productVersionId?: string;
    /** Format: int64 */
    quantity: number;
    referencedId?: string;
    removable?: boolean;
    stackable?: boolean;
    states: string[];
    /** Format: float */
    totalPrice?: number;
    translated?: {
      apiAlias?: string;
      coverId?: string;
      description?: string;
      identifier?: string;
      label?: string;
      orderId?: string;
      orderVersionId?: string;
      parentId?: string;
      parentVersionId?: string;
      productId?: string;
      productVersionId?: string;
      referencedId?: string;
      type?: string;
      versionId?: string;
    };
    type?: string;
    /** Format: float */
    unitPrice?: number;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderLineItemDownload: {
    accessGranted: boolean;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    media: components['schemas']['Media'];
    mediaId: string;
    orderLineItem?: components['schemas']['OrderLineItem'];
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    /** Format: int64 */
    position: number;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderRouteResponse: {
    orders: {
      elements: components['schemas']['Order'][];
    } & components['schemas']['EntitySearchResult'];
    /** The key-value pairs contain the uuid of the order as key and a boolean as value, indicating that the payment method can still be changed. */
    paymentChangeable?: {
      [key: string]: boolean;
    };
  };
  OrderTag: {
    id?: string;
    order?: components['schemas']['Order'];
    orderId: string;
    orderVersionId?: string;
    tag?: components['schemas']['Tag'];
    tagId: string;
  };
  OrderTransaction: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    captures?: components['schemas']['OrderTransactionCapture'][];
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    orderId: string;
    orderVersionId?: string;
    paymentMethod?: components['schemas']['PaymentMethod'];
    paymentMethodId: string;
    stateId: string;
    stateMachineState?: components['schemas']['StateMachineState'];
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderTransactionCapture: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    externalReference?: string;
    id: string;
    orderTransactionId: string;
    orderTransactionVersionId?: string;
    refunds?: components['schemas']['OrderTransactionCaptureRefund'][];
    stateId: string;
    stateMachineState?: components['schemas']['StateMachineState'];
    transaction?: components['schemas']['OrderTransaction'];
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderTransactionCaptureRefund: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    captureId: string;
    captureVersionId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    externalReference?: string;
    id: string;
    positions?: components['schemas']['OrderTransactionCaptureRefundPosition'][];
    reason?: string;
    stateId: string;
    stateMachineState?: components['schemas']['StateMachineState'];
    transactionCapture?: components['schemas']['OrderTransactionCapture'];
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  OrderTransactionCaptureRefundPosition: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    externalReference?: string;
    id: string;
    orderLineItem?: components['schemas']['OrderLineItem'];
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    orderTransactionCaptureRefund?: components['schemas']['OrderTransactionCaptureRefund'];
    /** Format: int64 */
    quantity?: number;
    reason?: string;
    refundId: string;
    refundVersionId?: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  PaymentMethod: {
    active?: boolean;
    afterOrderEnabled?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    asynchronous?: boolean;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    distinguishableName?: string;
    id: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    /** Runtime field, cannot be used as part of the criteria. */
    prepared?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    recurring?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    refundable?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    shortName?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    synchronous?: boolean;
    technicalName?: string;
    translated?: {
      description?: string;
      distinguishableName?: string;
      mediaId?: string;
      name?: string;
      shortName?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  PaymentMethodJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    afterOrderEnabled?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    asynchronous?: boolean;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    distinguishableName?: string;
    id: string;
    mediaId?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    /** Runtime field, cannot be used as part of the criteria. */
    prepared?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    recurring?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    refundable?: boolean;
    relationships?: {
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /payment-method/da8da1569e6bef3249a7064261df833f/media
           */
          related?: string;
        };
      };
    };
    /** Runtime field, cannot be used as part of the criteria. */
    shortName?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    synchronous?: boolean;
    technicalName?: string;
    translated?: {
      description?: string;
      distinguishableName?: string;
      mediaId?: string;
      name?: string;
      shortName?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  Plugin: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  PriceDefinition: {
    /** @enum {string} */
    apiAlias?: 'cart_price_quantity';
    isCalculated?: boolean;
    listPrice?: components['schemas']['ListPrice'];
    price?: number;
    quantity?: number;
    regulationPrice?: {
      /** Format: float */
      price?: number;
    };
    taxRules?: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    type?: string;
  };
  Product: {
    active?: boolean;
    /** @enum {string} */
    apiAlias: 'product';
    available?: boolean;
    /** Format: int64 */
    availableStock?: number;
    calculatedCheapestPrice?: {
      /** @enum {string} */
      apiAlias?: 'calculated_cheapest_price';
      hasRange?: boolean;
      listPrice?: components['schemas']['ListPrice'] | null;
      quantity?: number;
      referencePrice?: components['schemas']['ReferencePrice'] | null;
      regulationPrice?: {
        price: number;
      } | null;
      totalPrice?: number;
      unitPrice?: number;
      variantId?: string | null;
    };
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    calculatedMaxPurchase?: number;
    calculatedPrice: components['schemas']['CalculatedPrice'];
    calculatedPrices: components['schemas']['CalculatedPrice'][];
    canonicalProduct?: components['schemas']['Product'];
    canonicalProductId?: string;
    canonicalProductVersionId?: string;
    categories?: components['schemas']['Category'][];
    categoriesRo?: components['schemas']['Category'][];
    categoryIds?: readonly string[];
    categoryTree?: readonly string[];
    /** Format: int64 */
    childCount?: number;
    children?: components['schemas']['Product'][];
    cmsPage?: components['schemas']['CmsPage'];
    cmsPageId?: string;
    cmsPageVersionId?: string;
    configuratorSettings?: components['schemas']['ProductConfiguratorSetting'][];
    cover?: components['schemas']['ProductMedia'];
    coverId?: string;
    /** Format: date-time */
    createdAt: string;
    crossSellings?: components['schemas']['ProductCrossSelling'][];
    customFields?: GenericRecord;
    deliveryTime?: components['schemas']['DeliveryTime'];
    deliveryTimeId?: string;
    description?: string;
    displayGroup?: string;
    downloads?: components['schemas']['ProductDownload'][];
    ean?: string;
    /** Format: float */
    height?: number;
    id: string;
    isCloseout?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    isNew?: boolean;
    keywords?: string;
    /** Format: float */
    length?: number;
    mainCategories?: components['schemas']['MainCategory'][];
    manufacturer?: components['schemas']['ProductManufacturer'];
    manufacturerId?: string;
    manufacturerNumber?: string;
    markAsTopseller?: boolean;
    /** Format: int64 */
    maxPurchase?: number;
    media?: components['schemas']['ProductMedia'][];
    metaDescription?: string;
    metaTitle?: string;
    /** Format: int64 */
    minPurchase?: number;
    name: string;
    optionIds?: readonly string[];
    options?: components['schemas']['PropertyGroupOption'][];
    packUnit?: string;
    packUnitPlural?: string;
    parent?: components['schemas']['Product'];
    parentId?: string;
    parentVersionId?: string;
    productManufacturerVersionId?: string;
    productMediaVersionId?: string;
    productNumber: string;
    productReviews?: components['schemas']['ProductReview'][];
    properties?: components['schemas']['PropertyGroupOption'][];
    propertyIds?: readonly string[];
    /** Format: int64 */
    purchaseSteps?: number;
    /** Format: float */
    purchaseUnit?: number;
    /** Format: float */
    ratingAverage?: number;
    /** Format: float */
    referenceUnit?: number;
    /** Format: date-time */
    releaseDate?: string;
    /** Format: int64 */
    restockTime?: number;
    /** Format: int64 */
    sales?: number;
    seoCategory: components['schemas']['Category'];
    seoUrls?: components['schemas']['SeoUrl'][];
    shippingFree?: boolean;
    sortedProperties?: GenericRecord;
    states?: readonly string[];
    /** Format: int64 */
    stock: number;
    streamIds?: readonly string[];
    streams?: components['schemas']['ProductStream'][];
    tagIds?: readonly string[];
    tags?: components['schemas']['Tag'][];
    tax?: components['schemas']['Tax'];
    taxId: string;
    translated: {
      apiAlias?: string;
      canonicalProductId?: string;
      canonicalProductVersionId?: string;
      cmsPageId?: string;
      cmsPageVersionId?: string;
      coverId?: string;
      deliveryTimeId?: string;
      description?: string;
      displayGroup?: string;
      ean?: string;
      keywords?: string;
      manufacturerId?: string;
      manufacturerNumber?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      packUnit?: string;
      packUnitPlural?: string;
      parentId?: string;
      parentVersionId?: string;
      productManufacturerVersionId?: string;
      productMediaVersionId?: string;
      productNumber?: string;
      releaseDate?: string;
      taxId?: string;
      unitId?: string;
      versionId?: string;
    };
    unit?: components['schemas']['Unit'];
    unitId?: string;
    /** Format: date-time */
    updatedAt?: string;
    variantListingConfig?: {
      displayParent?: boolean;
    } | null;
    versionId?: string;
    /** Format: float */
    weight?: number;
    /** Format: float */
    width?: number;
  };
  ProductConfiguratorSetting: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    option?: components['schemas']['PropertyGroupOption'];
    optionId: string;
    /** Format: int64 */
    position?: number;
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  ProductCrossSelling: {
    active?: boolean;
    /** Format: date-time */
    createdAt: string;
    id: string;
    /** Format: int64 */
    limit?: number;
    name: string;
    /** Format: int64 */
    position: number;
    sortBy?: string;
    sortDirection?: string;
    translated?: {
      name?: string;
      sortBy?: string;
      sortDirection?: string;
      type?: string;
    };
    type: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductCrossSellingAssignedProducts: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductDetailResponse: {
    /** List of property groups with their corresponding options and information on how to display them. */
    configurator?: components['schemas']['PropertyGroup'][];
    product: components['schemas']['Product'];
  };
  ProductDownload: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    media?: components['schemas']['Media'];
    mediaId: string;
    /** Format: int64 */
    position?: number;
    product?: components['schemas']['Product'];
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  ProductExport: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductFeatureSet: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    available?: boolean;
    /** Format: int64 */
    availableStock?: number;
    calculatedCheapestPrice?: GenericRecord;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    calculatedMaxPurchase?: number;
    calculatedPrice?: GenericRecord;
    calculatedPrices?: GenericRecord[];
    canonicalProductId?: string;
    canonicalProductVersionId?: string;
    categoryIds?: readonly string[];
    categoryTree?: readonly string[];
    /** Format: int64 */
    childCount?: number;
    cmsPageId?: string;
    cmsPageVersionId?: string;
    coverId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    deliveryTimeId?: string;
    description?: string;
    displayGroup?: string;
    ean?: string;
    /** Format: float */
    height?: number;
    id: string;
    isCloseout?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    isNew?: boolean;
    keywords?: string;
    /** Format: float */
    length?: number;
    manufacturerId?: string;
    manufacturerNumber?: string;
    markAsTopseller?: boolean;
    /** Format: int64 */
    maxPurchase?: number;
    metaDescription?: string;
    metaTitle?: string;
    /** Format: int64 */
    minPurchase?: number;
    name: string;
    optionIds?: readonly string[];
    packUnit?: string;
    packUnitPlural?: string;
    parentId?: string;
    parentVersionId?: string;
    productManufacturerVersionId?: string;
    productMediaVersionId?: string;
    productNumber: string;
    propertyIds?: readonly string[];
    /** Format: int64 */
    purchaseSteps?: number;
    /** Format: float */
    purchaseUnit?: number;
    /** Format: float */
    ratingAverage?: number;
    /** Format: float */
    referenceUnit?: number;
    relationships?: {
      canonicalProduct?: {
        data?: {
          /** @example 023995a50b56c0de077323e958b2bbcd */
          id?: string;
          /** @example product */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/canonicalProduct
           */
          related?: string;
        };
      };
      categories?: {
        data?: {
          /** @example b0b5ccb4a195a07fd3eed14affb8695f */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/categories
           */
          related?: string;
        };
      };
      categoriesRo?: {
        data?: {
          /** @example 7f0702d3a90d965b8c9158c451f43fdb */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/categoriesRo
           */
          related?: string;
        };
      };
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example product */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/children
           */
          related?: string;
        };
      };
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/cmsPage
           */
          related?: string;
        };
      };
      configuratorSettings?: {
        data?: {
          /** @example c0827fee13725d41f1fd7e292243f5aa */
          id?: string;
          /** @example product_configurator_setting */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/configuratorSettings
           */
          related?: string;
        };
      };
      cover?: {
        data?: {
          /** @example 41d0e299ca1abeb2094852da042165c7 */
          id?: string;
          /** @example product_media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/cover
           */
          related?: string;
        };
      };
      crossSellings?: {
        data?: {
          /** @example 89936e14544d1b403cecef938101b6b0 */
          id?: string;
          /** @example product_cross_selling */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/crossSellings
           */
          related?: string;
        };
      };
      deliveryTime?: {
        data?: {
          /** @example 8c888ae25a7bd42057370e31f7e01044 */
          id?: string;
          /** @example delivery_time */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/deliveryTime
           */
          related?: string;
        };
      };
      downloads?: {
        data?: {
          /** @example d07d50a751bc6ddf12bf3af0efee9b45 */
          id?: string;
          /** @example product_download */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/downloads
           */
          related?: string;
        };
      };
      mainCategories?: {
        data?: {
          /** @example 1fb731fc4139cbb575429e28846f0c39 */
          id?: string;
          /** @example main_category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/mainCategories
           */
          related?: string;
        };
      };
      manufacturer?: {
        data?: {
          /** @example c2904bca62b22443d6cf5e9d89cab204 */
          id?: string;
          /** @example product_manufacturer */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/manufacturer
           */
          related?: string;
        };
      };
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example product_media */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/media
           */
          related?: string;
        };
      };
      options?: {
        data?: {
          /** @example 93da65a9fd0004d9477aeac024e08e15 */
          id?: string;
          /** @example property_group_option */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/options
           */
          related?: string;
        };
      };
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example product */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/parent
           */
          related?: string;
        };
      };
      productReviews?: {
        data?: {
          /** @example 01e78541ea343ed72424a5222796a4cd */
          id?: string;
          /** @example product_review */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/productReviews
           */
          related?: string;
        };
      };
      properties?: {
        data?: {
          /** @example 74693d2fc58b46bd06410f278e39aa71 */
          id?: string;
          /** @example property_group_option */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/properties
           */
          related?: string;
        };
      };
      seoCategory?: {
        data?: {
          /** @example 9354d004d12e03d35ad8292bf0bb234d */
          id?: string;
          /** @example category */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/seoCategory
           */
          related?: string;
        };
      };
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/seoUrls
           */
          related?: string;
        };
      };
      streams?: {
        data?: {
          /** @example 2f6f4768f1c2d7c8f1f54823723f1a70 */
          id?: string;
          /** @example product_stream */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/streams
           */
          related?: string;
        };
      };
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/tags
           */
          related?: string;
        };
      };
      tax?: {
        data?: {
          /** @example 06565e5611f23fdf8cc43e5077b92b54 */
          id?: string;
          /** @example tax */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/tax
           */
          related?: string;
        };
      };
      unit?: {
        data?: {
          /** @example 3e34bdebd9bd5edda27e8728904a2552 */
          id?: string;
          /** @example unit */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/unit
           */
          related?: string;
        };
      };
    };
    /** Format: date-time */
    releaseDate?: string;
    /** Format: int64 */
    restockTime?: number;
    /** Format: int64 */
    sales?: number;
    shippingFree?: boolean;
    sortedProperties?: GenericRecord;
    states?: readonly string[];
    /** Format: int64 */
    stock: number;
    streamIds?: readonly string[];
    tagIds?: readonly string[];
    taxId: string;
    translated?: {
      canonicalProductId?: string;
      canonicalProductVersionId?: string;
      cmsPageId?: string;
      cmsPageVersionId?: string;
      coverId?: string;
      deliveryTimeId?: string;
      description?: string;
      displayGroup?: string;
      ean?: string;
      keywords?: string;
      manufacturerId?: string;
      manufacturerNumber?: string;
      metaDescription?: string;
      metaTitle?: string;
      name?: string;
      packUnit?: string;
      packUnitPlural?: string;
      parentId?: string;
      parentVersionId?: string;
      productManufacturerVersionId?: string;
      productMediaVersionId?: string;
      productNumber?: string;
      releaseDate?: string;
      taxId?: string;
      unitId?: string;
      versionId?: string;
    };
    unitId?: string;
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
    /** Format: float */
    weight?: number;
    /** Format: float */
    width?: number;
  } & {
    options: {
      group: string;
      option: string;
      translated: {
        group: string;
        option: string;
      };
    }[];
  };
  ProductKeywordDictionary: {
    id?: string;
    keyword: string;
    languageId: string;
  };
  ProductListingCriteria: components['schemas']['Criteria'] & {
    /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
    limit?: number;
    /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
    manufacturer?: string;
    /**
     * Enables/disabled filtering by manufacturer. If set to false, the `manufacturer` filter will be ignored. Also the `aggregations[manufacturer]` key will be removed from the response.
     * @default true
     */
    'manufacturer-filter'?: boolean;
    /**
     * Filters by a maximum product price. Has to be higher than the `min-price` filter.
     * @default 0
     */
    'max-price'?: number;
    /**
     * Filters by a minimum product price. Has to be lower than the `max-price` filter.
     * @default 0
     */
    'min-price'?: number;
    /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
    order?: string;
    /**
     * Search result page
     * @default 1
     */
    p?: number;
    /**
     * Enables/disabled filtering by price. If set to false, the `min-price` and `max-price` filter will be ignored. Also the `aggregations[price]` key will be removed from the response.
     * @default true
     */
    'price-filter'?: boolean;
    /** Filters products by their properties. List of property identifiers separated by a `|`. */
    properties?: string;
    /**
     * Enables/disabled filtering by properties products. If set to false, the `properties` filter will be ignored. Also the `aggregations[properties]` key will be removed from the response.
     * @default true
     */
    'property-filter'?: boolean;
    /** A whitelist of property identifiers which can be used for filtering. List of property identifiers separated by a `|`. The `property-filter` must be `true`, otherwise the whitelist has no effect. */
    'property-whitelist'?: string;
    /** Filter products with a minimum average rating. */
    rating?: number;
    /**
     * Enables/disabled filtering by rating. If set to false, the `rating` filter will be ignored. Also the `aggregations[rating]` key will be removed from the response.
     * @default true
     */
    'rating-filter'?: boolean;
    /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
    'reduce-aggregations'?: string | null;
    /**
     * Filters products that are marked as shipping-free.
     * @default false
     */
    'shipping-free'?: boolean;
    /**
     * Enables/disabled filtering by shipping-free products. If set to false, the `shipping-free` filter will be ignored. Also the `aggregations[shipping-free]` key will be removed from the response.
     * @default true
     */
    'shipping-free-filter'?: boolean;
  };
  ProductListingFlags: {
    /** Resets all aggregations in the criteria. This parameter is a flag, the value has no effect. */
    'no-aggregations'?: string | null;
    /** If this flag is set, no products are fetched. Sorting and associations are also ignored. This parameter is a flag, the value has no effect. */
    'only-aggregations'?: string | null;
  };
  ProductListingResult: components['schemas']['EntitySearchResult'] & {
    /** @enum {string} */
    apiAlias: 'product_listing';
    /** Contains the available sorting. These can be used to show a sorting select-box in the product listing. */
    availableSortings: {
      /** @enum {string} */
      apiAlias: 'product_sorting';
      key: string;
      label: string;
      priority: number;
      translated: {
        apiAlias?: string;
        key?: string;
        label: string;
      };
    }[];
    /** Contains the state of the filters. These can be used to create listing filters. */
    currentFilters: {
      manufacturer: string[];
      navigationId: string;
      price: {
        /** @default 0 */
        max: number;
        /** @default 0 */
        min: number;
      };
      properties: string[];
      rating: number | null;
      search?: string;
      /** @default false */
      'shipping-free': boolean;
    };
    elements: components['schemas']['Product'][];
    /** @enum {string} */
    entity?: 'product';
    sorting?: string;
  };
  ProductManufacturer: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    id: string;
    link?: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    name: string;
    translated?: {
      description?: string;
      link?: string;
      mediaId?: string;
      name?: string;
      versionId?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  ProductMedia: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    media: components['schemas']['Media'];
    mediaId: string;
    /** Format: int64 */
    position?: number;
    productId: string;
    productVersionId?: string;
    thumbnails?: components['schemas']['MediaThumbnail'][];
    /** Format: date-time */
    updatedAt?: string;
    versionId?: string;
  };
  ProductPrice: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductReview: {
    comment?: string;
    content: string;
    /** Format: date-time */
    createdAt: string;
    customerId?: string;
    customFields?: GenericRecord;
    externalUser?: string;
    id: string;
    languageId: string;
    /** Format: float */
    points: number;
    productId: string;
    productVersionId?: string;
    salesChannelId: string;
    status?: boolean;
    title: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductSearchConfig: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductSearchConfigField: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductSearchKeyword: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductSorting: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    key: string;
    label: string;
    /** Format: int64 */
    priority: number;
    translated?: {
      key?: string;
      label?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductStream: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    id: string;
    name: string;
    translated?: {
      description?: string;
      name?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductStreamFilter: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ProductVisibility: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Promotion: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  PromotionDiscount: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  PromotionDiscountPrices: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  PromotionIndividualCode: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  PromotionSalesChannel: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  PromotionSetgroup: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  PropertyGroup: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    displayType: string;
    filterable?: boolean;
    id: string;
    name: string;
    options?: components['schemas']['PropertyGroupOption'][];
    /** Format: int64 */
    position?: number;
    sortingType: string;
    translated?: {
      description?: string;
      displayType?: string;
      name?: string;
      sortingType?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
    visibleOnProductDetailPage?: boolean;
  };
  PropertyGroupOption: {
    colorHexCode?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    group: components['schemas']['PropertyGroup'];
    groupId: string;
    id: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    name: string;
    option: string;
    /** Format: int64 */
    position?: number;
    translated: {
      colorHexCode?: string;
      groupId?: string;
      mediaId?: string;
      name?: string;
      option?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  Query: {
    query?:
      | components['schemas']['SimpleFilter']
      | components['schemas']['EqualsFilter']
      | components['schemas']['MultiNotFilter']
      | components['schemas']['RangeFilter'];
    score?: number;
    [key: string]: unknown;
  };
  Quote: unknown;
  RangeFilter: {
    field: string;
    parameters: {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
    };
    /** @enum {string} */
    type: 'range';
  };
  ReferencePrice: {
    /** @enum {string} */
    apiAlias?: 'cart_price_reference';
    hasRange: boolean;
    listPrice: components['schemas']['ListPrice'] | null;
    price?: number;
    purchaseUnit?: number;
    referenceUnit?: number;
    regulationPrice: {
      /** @enum {string} */
      apiAlias?: 'cart_regulation_price';
      price?: number;
    } | null;
    unitName: string;
    /** Format: ^[0-9a-f]{32}$ */
    variantId?: string | null;
  };
  Rule: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    id?: string;
    name: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  RuleCondition: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  SalesChannel: {
    active?: boolean;
    configuration?: GenericRecord;
    country?: components['schemas']['Country'];
    countryId: string;
    /** Format: date-time */
    createdAt: string;
    currency?: components['schemas']['Currency'];
    currencyId: string;
    customerGroupId: string;
    customFields?: GenericRecord;
    domains?: components['schemas']['SalesChannelDomain'][];
    footerCategory?: components['schemas']['Category'];
    footerCategoryId?: string;
    footerCategoryVersionId?: string;
    hreflangActive?: boolean;
    hreflangDefaultDomain?: components['schemas']['SalesChannelDomain'];
    hreflangDefaultDomainId?: string;
    id: string;
    language?: components['schemas']['Language'];
    languageId: string;
    mailHeaderFooterId?: string;
    maintenance?: boolean;
    name: string;
    navigationCategory?: components['schemas']['Category'];
    /** Format: int64 */
    navigationCategoryDepth?: number;
    navigationCategoryId: string;
    navigationCategoryVersionId?: string;
    paymentMethod?: components['schemas']['PaymentMethod'];
    paymentMethodId: string;
    serviceCategory?: components['schemas']['Category'];
    serviceCategoryId?: string;
    serviceCategoryVersionId?: string;
    shippingMethod?: components['schemas']['ShippingMethod'];
    shippingMethodId: string;
    shortName?: string;
    taxCalculationType?: string;
    translated?: {
      countryId?: string;
      currencyId?: string;
      customerGroupId?: string;
      footerCategoryId?: string;
      footerCategoryVersionId?: string;
      hreflangDefaultDomainId?: string;
      languageId?: string;
      mailHeaderFooterId?: string;
      name?: string;
      navigationCategoryId?: string;
      navigationCategoryVersionId?: string;
      paymentMethodId?: string;
      serviceCategoryId?: string;
      serviceCategoryVersionId?: string;
      shippingMethodId?: string;
      shortName?: string;
      taxCalculationType?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  SalesChannelAnalytics: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  SalesChannelContext: {
    /** @enum {string} */
    apiAlias: 'sales_channel_context';
    /** Core context with general configuration values and state */
    context?: {
      currencyFactor?: number;
      currencyId?: string;
      /** Format: int32 */
      currencyPrecision?: number;
      languageIdChain?: string[];
      scope?: string;
      source?: string;
      taxState?: string;
      useCache?: boolean;
      versionId?: string;
    };
    currency?: components['schemas']['Currency'];
    /** Customer group of the current user */
    currentCustomerGroup?: {
      displayGross?: boolean;
      name?: string;
    };
    customer?: components['schemas']['Customer'];
    /** Fallback group if the default customer group is not applicable */
    fallbackCustomerGroup?: {
      displayGross?: boolean;
      name?: string;
    };
    paymentMethod?: components['schemas']['PaymentMethod'];
    salesChannel: components['schemas']['SalesChannel'];
    shippingLocation?: {
      address?: components['schemas']['CustomerAddress'];
      /** @enum {string} */
      apiAlias?: 'cart_delivery_shipping_location';
      country?: components['schemas']['Country'];
    };
    shippingMethod?: components['schemas']['ShippingMethod'];
    /** Currently active tax rules and/or rates */
    taxRules?: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    /** Context the user session */
    token?: string;
  };
  SalesChannelDomain: {
    /** Format: date-time */
    createdAt: string;
    currency?: components['schemas']['Currency'];
    currencyId: string;
    customFields?: GenericRecord;
    hreflangUseOnlyLocale?: boolean;
    id: string;
    language?: components['schemas']['Language'];
    languageId: string;
    salesChannelDefaultHreflang?: components['schemas']['SalesChannel'];
    salesChannelId: string;
    snippetSetId: string;
    /** Format: date-time */
    updatedAt?: string;
    url: string;
  };
  SalesChannelType: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  Salutation: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    displayName: string;
    id: string;
    letterName: string;
    salutationKey: string;
    translated?: {
      displayName?: string;
      letterName?: string;
      salutationKey?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  SalutationJsonApi: components['schemas']['resource'] & {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    displayName: string;
    id: string;
    letterName: string;
    salutationKey: string;
    translated?: {
      displayName?: string;
      letterName?: string;
      salutationKey?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  ScheduledTask: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Script: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  SeoUrl: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Runtime field, cannot be used as part of the criteria. */
    error?: string;
    foreignKey: string;
    id: string;
    isCanonical?: boolean;
    isDeleted?: boolean;
    isModified?: boolean;
    languageId: string;
    pathInfo: string;
    /** @enum {string} */
    routeName: 'frontend.navigation.page' | 'frontend.landing.page' | 'frontend.detail.page';
    salesChannelId?: string;
    seoPathInfo: string;
    /** Format: date-time */
    updatedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url?: string;
  };
  SeoUrlJsonApi: components['schemas']['resource'] & {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    /** Runtime field, cannot be used as part of the criteria. */
    error?: string;
    foreignKey: string;
    id: string;
    isCanonical?: boolean;
    isDeleted?: boolean;
    isModified?: boolean;
    languageId: string;
    pathInfo: string;
    routeName: string;
    salesChannelId?: string;
    seoPathInfo: string;
    /** Format: date-time */
    updatedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url?: string;
  };
  SeoUrlTemplate: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    isValid?: boolean;
    salesChannelId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  ShippingMethod: {
    active?: boolean;
    availabilityRule?: components['schemas']['Rule'];
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    deliveryTime?: components['schemas']['DeliveryTime'];
    deliveryTimeId: string;
    description?: string;
    id: string;
    media?: components['schemas']['Media'];
    mediaId?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    prices?: components['schemas']['ShippingMethodPrice'][];
    tags?: components['schemas']['Tag'][];
    tax?: components['schemas']['Tax'];
    taxType: string;
    technicalName?: string;
    trackingUrl?: string;
    translated?: {
      deliveryTimeId?: string;
      description?: string;
      mediaId?: string;
      name?: string;
      taxType?: string;
      technicalName?: string;
      trackingUrl?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  ShippingMethodJsonApi: components['schemas']['resource'] & {
    active?: boolean;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    deliveryTimeId: string;
    description?: string;
    id: string;
    mediaId?: string;
    name: string;
    /** Format: int64 */
    position?: number;
    relationships?: {
      availabilityRule?: {
        data?: {
          /** @example 9fbb7961d1cb158094924c679e1b302c */
          id?: string;
          /** @example rule */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/availabilityRule
           */
          related?: string;
        };
      };
      deliveryTime?: {
        data?: {
          /** @example 8c888ae25a7bd42057370e31f7e01044 */
          id?: string;
          /** @example delivery_time */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/deliveryTime
           */
          related?: string;
        };
      };
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/media
           */
          related?: string;
        };
      };
      prices?: {
        data?: {
          /** @example afae32efe0f84fece3f96b377b768b33 */
          id?: string;
          /** @example shipping_method_price */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/prices
           */
          related?: string;
        };
      };
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/tags
           */
          related?: string;
        };
      };
      tax?: {
        data?: {
          /** @example 06565e5611f23fdf8cc43e5077b92b54 */
          id?: string;
          /** @example tax */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/tax
           */
          related?: string;
        };
      };
    };
    taxType: string;
    technicalName?: string;
    trackingUrl?: string;
    translated?: {
      deliveryTimeId?: string;
      description?: string;
      mediaId?: string;
      name?: string;
      taxType?: string;
      technicalName?: string;
      trackingUrl?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  ShippingMethodPageRouteResponse: {
    active?: boolean;
    availabilityRule?: {
      description?: string;
      invalid?: boolean;
      name?: string;
      /** Format: int32 */
      priority?: number;
    };
    availabilityRuleId?: string;
    deliveryTime?: {
      /** Format: int32 */
      max?: number;
      /** Format: int32 */
      min?: number;
      name?: string;
      unit?: string;
    };
    deliveryTimeId?: string;
    description?: string;
    media?: {
      alt?: string;
      fileExtension?: string;
      fileName?: string;
      /** Format: int32 */
      fileSize?: number;
      mediaFolderId?: string;
      mediaTypeRaw?: string;
      metaDataRaw?: string;
      mimeType?: string;
      private?: boolean;
      thumbnailsRo?: string;
      title?: string;
      /** Format: date-time */
      uploadedAt?: string;
      url?: string;
      userId?: string;
    };
    mediaId?: string;
    name?: string;
    orderDeliveries?: {
      orderId?: string;
      /** Format: date-time */
      shippingDateEarliest?: string;
      /** Format: date-time */
      shippingDateLatest?: string;
      shippingMethodId?: string;
      shippingOrderAddressId?: string;
      stateId?: string;
    }[];
    prices?: {
      /** Format: int32 */
      calculation?: number;
      calculationRuleId?: string;
      currencyId?: string;
      /** Format: float */
      price?: number;
      /** Format: float */
      quantityEnd?: number;
      /** Format: float */
      quantityStart?: number;
      ruleId?: string;
      shippingMethodId?: string;
    }[];
    salesChannelDefaultAssignments?: {
      accessKey?: string;
      active?: boolean;
      countryId?: string;
      currencyId?: string;
      customerGroupId?: string;
      footerCategoryId?: string;
      hreflangActive?: boolean;
      hreflangDefaultDomainId?: string;
      languageId?: string;
      mailHeaderFooterId?: string;
      maintenance?: boolean;
      maintenanceIpWhitelist?: string;
      name?: string;
      /** Format: int32 */
      navigationCategoryDepth?: number;
      navigationCategoryId?: string;
      paymentMethodId?: string;
      serviceCategoryId?: string;
      shippingMethodId?: string;
      shortName?: string;
      typeId?: string;
    }[];
    salesChannels?: {
      accessKey?: string;
      active?: boolean;
      countryId?: string;
      currencyId?: string;
      customerGroupId?: string;
      footerCategoryId?: string;
      hreflangActive?: boolean;
      hreflangDefaultDomainId?: string;
      languageId?: string;
      mailHeaderFooterId?: string;
      maintenance?: boolean;
      maintenanceIpWhitelist?: string;
      name?: string;
      /** Format: int32 */
      navigationCategoryDepth?: number;
      navigationCategoryId?: string;
      paymentMethodId?: string;
      serviceCategoryId?: string;
      shippingMethodId?: string;
      shortName?: string;
      typeId?: string;
    }[];
    tags?: {
      name?: string;
    }[];
    translations?: {
      description?: string;
      name?: string;
      shippingMethodId?: string;
    }[];
  }[];
  ShippingMethodPrice: {
    /** Format: int64 */
    calculation?: number;
    calculationRuleId?: string;
    /** Format: date-time */
    createdAt: string;
    currencyPrice?: GenericRecord;
    customFields?: GenericRecord;
    id: string;
    /** Format: float */
    quantityEnd?: number;
    /** Format: float */
    quantityStart?: number;
    ruleId?: string;
    shippingMethodId: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  SimpleFilter: {
    field: string;
    /** @enum {string} */
    type: 'contains' | 'equalsAny' | 'prefix' | 'suffix';
    value: string;
  };
  Sitemap: components['schemas']['ArrayStruct'] & {
    /** Format: date-time */
    created: string;
    filename: string;
  };
  Snippet: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    setId: string;
    translationKey: string;
    /** Format: date-time */
    updatedAt?: string;
    value: string;
  };
  SnippetSet: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    iso: string;
    name: string;
    snippets?: components['schemas']['Snippet'][];
    /** Format: date-time */
    updatedAt?: string;
  };
  Sort: {
    field: string;
    naturalSorting?: boolean;
    /** @enum {string} */
    order: 'ASC' | 'DESC';
    type?: string;
  };
  StateMachine: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    states?: components['schemas']['StateMachineState'][];
    transitions?: components['schemas']['StateMachineTransition'][];
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  StateMachineHistory: {
    /** Format: date-time */
    createdAt: string;
    fromStateMachineState?: components['schemas']['StateMachineState'];
    id?: string;
    toStateMachineState?: components['schemas']['StateMachineState'];
    /** Format: date-time */
    updatedAt?: string;
  };
  StateMachineState: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id?: string;
    name: string;
    technicalName: string;
    translated: {
      name?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  StateMachineTransition: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Struct: {
    /** Alias which can be used to restrict response fields. For more information see [includes](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#includes-apialias). */
    apiAlias?: string;
  };
  SubAggregations: {
    aggregation?:
      | components['schemas']['AggregationMetrics']
      | components['schemas']['AggregationEntity']
      | components['schemas']['AggregationFilter']
      | components['schemas']['AggregationTerms']
      | components['schemas']['AggregationHistogram']
      | components['schemas']['AggregationRange'];
  };
  SuccessResponse: {
    success?: boolean;
  };
  SystemConfig: {
    configurationKey: string;
    configurationValue: {
      _value?: GenericRecord;
    };
    /** Format: date-time */
    createdAt: string;
    id: string;
    salesChannel?: components['schemas']['SalesChannel'];
    salesChannelId?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Tag: {
    /** Format: date-time */
    createdAt: string;
    id: string;
    name: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Tax: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /**
     * Format: int64
     * Added since version: 6.4.0.0.
     */
    position: number;
    /** Format: float */
    taxRate: number;
    /** Format: date-time */
    updatedAt?: string;
  };
  TaxProvider: {
    active?: boolean;
    appId?: string;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /** Format: int64 */
    priority: number;
    processUrl?: string;
    translated?: {
      appId?: string;
      name?: string;
      processUrl?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  TaxRule: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  TaxRuleType: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    translated?: Record<string, never>;
    /** Format: date-time */
    updatedAt?: string;
  };
  Theme: {
    active: boolean;
    author: string;
    baseConfig?: GenericRecord;
    configValues?: GenericRecord;
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    description?: string;
    helpTexts?: GenericRecord;
    id: string;
    labels?: GenericRecord;
    media?: components['schemas']['Media'][];
    name: string;
    parentThemeId?: string;
    previewMediaId?: string;
    technicalName?: string;
    translated?: {
      author?: string;
      description?: string;
      name?: string;
      parentThemeId?: string;
      previewMediaId?: string;
      technicalName?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  TotalCountMode: 'none' | 'exact' | 'next-pages';
  Unit: {
    /** Format: date-time */
    createdAt: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    shortCode: string;
    translated?: {
      name?: string;
      shortCode?: string;
    };
    /** Format: date-time */
    updatedAt?: string;
  };
  User: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  UserAccessKey: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  UserConfig: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  UserRecovery: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  Webhook: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  WebhookEventLog: {
    /** Format: date-time */
    createdAt: string;
    id?: string;
    /** Format: date-time */
    updatedAt?: string;
  };
  WishlistLoadRouteResponse: {
    products: components['schemas']['ProductListingResult'];
    wishlist?: {
      customerId?: string;
      salesChannelId?: string;
    };
  };
  attributes: {
    [key: string]: unknown;
  };
  data: components['schemas']['resource'] | components['schemas']['resource'][];
  error: {
    /** An application-specific error code, expressed as a string value. */
    code?: string;
    /** A human-readable description of the problem. */
    description?: string;
    /** A human-readable explanation specific to this occurrence of the problem. */
    detail?: string;
    /** A unique identifier for this particular occurrence of the problem. */
    id?: string;
    links?: components['schemas']['links'];
    meta?: components['schemas']['meta'];
    source?: {
      /** A string indicating which query parameter caused the error. */
      parameter?: string;
      /** A JSON Pointer [RFC6901] to the associated entity in the request document [e.g. "/data" for a primary data object, or "/data/attributes/title" for a specific attribute]. */
      pointer?: string;
    };
    /** The HTTP status code applicable to this problem, expressed as a string value. */
    status?: string;
    /** A short, human-readable summary of the problem. It **SHOULD NOT** change from occurrence to occurrence of the problem, except for purposes of localization. */
    title?: string;
  };
  failure: {
    errors: components['schemas']['error'][];
    links?: components['schemas']['links'];
    meta?: components['schemas']['meta'];
  };
  info: {
    jsonapi?: components['schemas']['jsonapi'];
    links?: components['schemas']['links'];
    meta: components['schemas']['meta'];
  };
  jsonapi: {
    meta?: components['schemas']['meta'];
    version?: string;
  };
  link: OneOf<
    [
      string,
      {
        /**
         * Format: uri-reference
         * A string containing the link's URL.
         */
        href: string;
        meta?: components['schemas']['meta'];
      },
    ]
  >;
  linkage: {
    id: string;
    meta?: components['schemas']['meta'];
    type: string;
  };
  links: {
    [key: string]: components['schemas']['link'];
  };
  meta: {
    [key: string]: unknown;
  };
  pagination: {
    /**
     * Format: uri-reference
     * The first page of data
     */
    first?: string;
    /**
     * Format: uri-reference
     * The last page of data
     */
    last?: string;
    /**
     * Format: uri-reference
     * The next page of data
     */
    next?: string;
    /**
     * Format: uri-reference
     * The previous page of data
     */
    prev?: string;
  };
  relationshipLinks: {
    related?: components['schemas']['link'];
    self?: GenericRecord[] & components['schemas']['link'];
    [key: string]: unknown;
  };
  relationshipToMany: components['schemas']['linkage'][];
  relationshipToOne: components['schemas']['linkage'];
  relationships: unknown;
  resource: {
    attributes?: components['schemas']['attributes'];
    id: string;
    links?: components['schemas']['links'];
    meta?: components['schemas']['meta'];
    relationships?: components['schemas']['relationships'];
    type: string;
  };
  success: {
    data: components['schemas']['data'];
    /** To reduce the number of HTTP requests, servers **MAY** allow responses that include related resources along with the requested primary resources. Such responses are called "compound documents". */
    included?: components['schemas']['resource'][];
    /** Link members related to the primary data. */
    links?: components['schemas']['links'] & components['schemas']['pagination'];
    meta?: components['schemas']['meta'];
  };
};
export type operations = {
  'api-info get /_info/openapi3.json': {
    contentType?: 'application/json';
    accept?: 'application/json';
    query?: {
      /** Type of the api */
      type?: 'jsonapi' | 'json';
    };
    response: {
      components?: {
        callbacks?: GenericRecord;
        examples?: GenericRecord;
        headers?: GenericRecord;
        links?: GenericRecord;
        parameters?: GenericRecord;
        pathItems?: GenericRecord;
        requestBodies?: GenericRecord;
        responses?: GenericRecord;
        schemas?: GenericRecord;
        securitySchemes?: GenericRecord;
      };
      externalDocs?: {
        description?: string;
        /** Format: uri */
        url: string;
      };
      info: {
        contact?: {
          /** Format: email */
          email?: string;
          name?: string;
          /** Format: uri */
          url?: string;
        };
        description?: string;
        license?: {
          identifier?: string;
          name: string;
          /** Format: uri */
          url?: string;
        };
        summary?: string;
        /** Format: uri */
        termsOfService?: string;
        title: string;
        version: string;
      };
      jsonSchemaDialect?: string;
      openapi: string;
      paths?: GenericRecord;
      security?: GenericRecord[];
      servers?: {
        url: string;
      }[];
      tags?: {
        description?: string;
        externalDocs?: {
          description?: string;
          /** Format: uri */
          url: string;
        };
        name: string;
      }[];
      webhooks?: GenericRecord;
    };
    responseCode: 200;
  };
  'createCustomerAddress post /account/address': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: components['schemas']['CustomerAddressBody'];
    response: components['schemas']['CustomerAddress'] & components['schemas']['CustomerAddressRead'];
    responseCode: 200;
  };
  'deleteCustomerAddress delete /account/address/{addressId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** ID of the address to be deleted. */
      addressId: string;
    };
    response: never;
    responseCode: 204;
  };
  'updateCustomerAddress patch /account/address/{addressId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    body: components['schemas']['CustomerAddressBody'];
    response: components['schemas']['CustomerAddress'] & components['schemas']['CustomerAddressRead'];
    responseCode: 200;
  };
  'defaultBillingAddress patch /account/address/default-billing/{addressId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    response: never;
    responseCode: 200;
  };
  'defaultShippingAddress patch /account/address/default-shipping/{addressId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    response: never;
    responseCode: 200;
  };
  'changeEmail post /account/change-email': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** New email address. Has to be unique amongst all customers */
      email: string;
      /** Confirmation of the new email address. */
      emailConfirmation: string;
      /** Customer's current password */
      password: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'changeLanguage post /account/change-language': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** New languageId */
      language?: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'changePassword post /account/change-password': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** New Password for the customer */
      newPassword: string;
      /** Confirmation of the new password */
      newPasswordConfirm: string;
      /** Current password of the customer */
      password: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'changePaymentMethod post /account/change-payment-method/{paymentMethodId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Identifier of the desired default payment method */
      paymentMethodId: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'changeProfile post /account/change-profile': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Birthday day */
      birthdayDay?: number;
      /** Birthday month */
      birthdayMonth?: number;
      /** Birthday year */
      birthdayYear?: number;
      /** Company of the customer. Only required when `accountType` is `business`. */
      company?: string;
      /** Customer first name. Value will be reused for shipping and billing address if not provided explicitly. */
      firstName: string;
      /** Customer last name. Value will be reused for shipping and billing address if not provided explicitly. */
      lastName: string;
      /** Id of the salutation for the customer account. Fetch options using `salutation` endpoint. */
      salutationId: string;
      /** (Academic) title of the customer */
      title?: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'readCustomer post /account/customer': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body?: components['schemas']['Criteria'];
    response: components['schemas']['Customer'];
    responseCode: 200;
  };
  'deleteCustomer delete /account/customer': {
    contentType?: 'application/json';
    accept?: 'application/json';
    response: never;
    responseCode: 204;
  };
  'getCustomerRecoveryIsExpired post /account/customer-recovery-is-expired': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Parameter from the link in the confirmation mail sent in Step 1 */
      hash: string;
    };
    response: components['schemas']['ArrayStruct'];
    responseCode: 200;
  };
  'listAddress post /account/list-address': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body?: components['schemas']['Criteria'];
    response: {
      elements: components['schemas']['CustomerAddress'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'loginCustomer post /account/login': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Password */
      password: string;
      /** Email */
      username: string;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  'logoutCustomer post /account/logout': {
    contentType?: 'application/json';
    accept?: 'application/json';
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  'readNewsletterRecipient post /account/newsletter-recipient': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body?: components['schemas']['Criteria'];
    response: components['schemas']['AccountNewsletterRecipientResult'];
    responseCode: 200;
  };
  'sendRecoveryMail post /account/recovery-password': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** E-Mail address to identify the customer */
      email: string;
      /** URL of the storefront to use for the generated reset link. It has to be a domain that is configured in the sales channel domain settings. */
      storefrontUrl: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'recoveryPassword post /account/recovery-password-confirm': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Parameter from the link in the confirmation mail sent in Step 1 */
      hash: string;
      /** New password for the customer */
      newPassword: string;
      /** Confirmation of the new password */
      newPasswordConfirm: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'register post /account/register': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Flag indicating accepted data protection */
      acceptedDataProtection: boolean;
      /**
       * Account type of the customer which can be either `private` or `business`.
       * @default private
       */
      accountType?: string;
      /** Field can be used to store an affiliate tracking code */
      affiliateCode?: string;
      billingAddress: components['schemas']['CustomerAddress'];
      /** Birthday day */
      birthdayDay?: number;
      /** Birthday month */
      birthdayMonth?: number;
      /** Birthday year */
      birthdayYear?: number;
      /** Field can be used to store a campaign tracking code */
      campaignCode?: string;
      /** Email of the customer. Has to be unique, unless `guest` is `true` */
      email: string;
      /** Customer first name. Value will be reused for shipping and billing address if not provided explicitly. */
      firstName: string;
      /**
       * If set, will create a guest customer. Guest customers can re-use an email address and don't need a password.
       * @default false
       */
      guest?: boolean;
      /** Customer last name. Value will be reused for shipping and billing address if not provided explicitly. */
      lastName: string;
      /** Password for the customer. Required, unless `guest` is `true` */
      password: string;
      /** Id of the salutation for the customer account. Fetch options using `salutation` endpoint. */
      salutationId: string;
      shippingAddress?: components['schemas']['CustomerAddress'];
      /** URL of the storefront for that registration. Used in confirmation emails. Has to be one of the configured domains of the sales channel. */
      storefrontUrl: string;
      /** (Academic) title of the customer */
      title?: string;
    };
    response: components['schemas']['Customer'];
    responseCode: 200;
  };
  'registerConfirm post /account/register-confirm': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Email hash from the email received */
      em: string;
      /** Hash from the email received */
      hash: string;
    };
    response: never;
    responseCode: 200;
  };
  'generateJWTAppSystemAppServer post /app-system/{name}/generate-token': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Name of the app */
      name: string;
    };
    body?: GenericRecord;
    response: {
      /** Format: date-time */
      expires?: string;
      shopId?: string;
      token?: string;
    };
    responseCode: 200;
  };
  'readCategoryList post /category': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['Category'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readCategory post /category/{navigationId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      'sw-include-seo-urls'?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    query?: {
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a '|' character */
      slots?: string;
    };
    pathParams: {
      /** Identifier of the category to be fetched */
      navigationId: string;
    };
    body: components['schemas']['Criteria'] & components['schemas']['ProductListingCriteria'];
    response: components['schemas']['Category'];
    responseCode: 200;
  };
  'readCart get /checkout/cart': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    response: components['schemas']['Cart'];
    responseCode: 200;
  };
  'deleteCart delete /checkout/cart': {
    contentType?: 'application/json';
    accept?: 'application/json';
    response: components['schemas']['SuccessResponse'];
    responseCode: 204;
  };
  'addLineItem post /checkout/cart/line-item': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      items: (
        | {
            id: string;
            quantity: number;
            referencedId?: string;
            /** @enum {string} */
            type: 'product' | 'custom' | 'credit' | 'discount' | 'container';
          }
        | {
            id?: string;
            quantity?: number;
            referencedId: string;
            /** @enum {string} */
            type: 'promotion';
          }
      )[];
    };
    response: components['schemas']['Cart'];
    responseCode: 200;
  };
  'removeLineItemDeprecated delete /checkout/cart/line-item': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    query: {
      /** A list of product identifiers. */
      ids: string[];
    };
    response: components['schemas']['Cart'];
    responseCode: 200;
  };
  'updateLineItem patch /checkout/cart/line-item': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: components['schemas']['CartItems'];
    response: components['schemas']['Cart'];
    responseCode: 200;
  };
  'removeLineItem post /checkout/cart/line-item/delete': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** A list of product identifiers. */
      ids: [string, ...string[]];
    };
    response: components['schemas']['Cart'];
    responseCode: 200;
  };
  'checkoutGateway get /checkout/gateway': {
    contentType?: 'application/json';
    accept?: 'application/json';
    response: {
      errors?: {
        /** If the error is blocking */
        blocking?: boolean;
        /** Error code */
        code?: string;
        /** Error detail */
        detail?: string;
      }[];
      paymentMethods?: {
        /** aggregation result */
        aggregations?: GenericRecord;
        elements?: components['schemas']['PaymentMethod'][];
        /** Total amount */
        total?: number;
      };
      shippingMethods?: {
        /** aggregation result */
        aggregations?: GenericRecord;
        elements?: components['schemas']['ShippingMethod'][];
        /** Total amount */
        total?: number;
      };
    };
    responseCode: 200;
  };
  'createOrder post /checkout/order': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** The affiliate code can be used to track which referrer the customer came through. An example could be `Price-comparison-company-XY`. */
      affiliateCode?: string;
      /** The campaign code is used to track which action the customer came from. An example could be `Summer-Deals` */
      campaignCode?: string;
      /** Adds a comment from the customer to the order. */
      customerComment?: string;
    };
    response: components['schemas']['Order'];
    responseCode: 200;
  };
  'readCms post /cms/{id}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of the CMS page to be resolved */
      id: string;
    };
    body: {
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a `|` character. */
      slots?: string;
    } & components['schemas']['ProductListingCriteria'];
    response: components['schemas']['CmsPage'];
    responseCode: 200;
  };
  'sendContactMail post /contact-form': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** Type of the content management page */
      cmsPageType?: string;
      /** The message of the contact form */
      comment: string;
      /** Email address */
      email: string;
      /** Entity name for slot config */
      entityName?: string;
      /** Firstname. This field may be required depending on the system settings. */
      firstName?: string;
      /** Lastname. This field may be required depending on the system settings. */
      lastName?: string;
      /**
       * Identifier of the navigation page. Can be used to override the configuration.
       * Take a look at the settings of a category containing a concact form in the administration.
       */
      navigationId?: string;
      /** Phone. This field may be required depending on the system settings. */
      phone?: string;
      /** Identifier of the salutation. Use `/api/salutation` endpoint to fetch possible values. */
      salutationId: string;
      /** Identifier of the cms element */
      slotId?: string;
      /** The subject of the contact form. */
      subject: string;
    };
    response: never;
    responseCode: 200;
  };
  'readContext get /context': {
    contentType?: 'application/json';
    accept?: 'application/json';
    response: components['schemas']['SalesChannelContext'];
    responseCode: 200;
  };
  'updateContext patch /context': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Billing Address */
      billingAddressId?: string;
      /** Country */
      countryId?: string;
      /** Country State */
      countryStateId?: string;
      /** Currency */
      currencyId?: string;
      /** Language */
      languageId?: string;
      /** Payment Method */
      paymentMethodId?: string;
      /** Shipping Address */
      shippingAddressId?: string;
      /** Shipping Method */
      shippingMethodId?: string;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  'readCountry post /country': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['Country'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readCountryState post /country-state/{countryId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      countryId: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['CountryState'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readCurrency post /currency': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: components['schemas']['Currency'][];
    responseCode: 200;
  };
  'getCustomerGroupRegistrationInfo get /customer-group-registration/config/{customerGroupId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Customer group id */
      customerGroupId: string;
    };
    response: components['schemas']['CustomerGroup'];
    responseCode: 200;
  };
  'readCustomerWishlist post /customer/wishlist': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: components['schemas']['WishlistLoadRouteResponse'];
    responseCode: 200;
  };
  'addProductOnWishlist post /customer/wishlist/add/{productId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Identifier of the product to be added. */
      productId: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'deleteProductOnWishlist delete /customer/wishlist/delete/{productId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** The identifier of the product to be removed from the wishlist. */
      productId: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'mergeProductOnWishlist post /customer/wishlist/merge': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** List product id */
      productIds?: string[];
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'download post /document/download/{documentId}/{deepLinkCode}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      documentId: string;
      deepLinkCode: string;
    };
    body?: components['schemas']['Criteria'];
    response: components['schemas']['Document'];
    responseCode: 200;
  };
  'handlePaymentMethod post /handle-payment': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** URL to which the client should be redirected after erroneous payment */
      errorUrl?: string;
      /** URL to which the client should be redirected after successful payment */
      finishUrl?: string;
      /** Identifier of an order */
      orderId: string;
    };
    response: {
      redirectUrl: string;
    };
    responseCode: 200;
  };
  'readLandingPage post /landing-page/{landingPageId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of the landing page. */
      landingPageId: string;
    };
    body: components['schemas']['Criteria'] &
      ({
        /** Resolves only the given slot identifiers. The identifiers have to be seperated by a `|` character. */
        slots?: string;
      } & components['schemas']['ProductListingCriteria']);
    response: components['schemas']['LandingPage'];
    responseCode: 200;
  };
  'readLanguages post /language': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements: components['schemas']['Language'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readMedia post /media': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Identifier (UUID) of the media entity to be fetched. */
      ids: string[];
    };
    response: components['schemas']['Media'][];
    responseCode: 200;
  };
  'readNavigation post /navigation/{activeId}/{rootId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      'sw-include-seo-urls'?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of the active category in the navigation tree (if not used, just set to the same as rootId). */
      activeId: string | components['schemas']['NavigationType'];
      /** Identifier of the root category for your desired navigation tree. You can use it to fetch sub-trees of your navigation tree. */
      rootId: string | components['schemas']['NavigationType'];
    };
    body: components['schemas']['Criteria'] & {
      /** Return the categories as a tree or as a flat list. */
      buildTree?: GenericRecord[];
      /**
       * Format: int32
       * Determines the depth of fetched navigation levels.
       */
      depth?: number;
    };
    response: components['schemas']['NavigationRouteResponse'];
    responseCode: 200;
  };
  'confirmNewsletter post /newsletter/confirm': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Email hash parameter from the link in the confirmation mail */
      em: string;
      /** Hash parameter from link the in the confirmation mail */
      hash: string;
    };
    response: never;
    responseCode: 200;
  };
  'subscribeToNewsletter post /newsletter/subscribe': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** City */
      city?: string;
      /** Custom field data that should be added to the subscription. */
      customFields?: string;
      /** Email address that will receive the confirmation and the newsletter. */
      email: string;
      /** First name */
      firstName?: string;
      /** Identifier of the language. */
      languageId?: string;
      /** Last name */
      lastName?: string;
      /** Defines what should be done. */
      option: string;
      /** Identifier of the salutation. */
      salutationId?: string;
      /** Url of the storefront of the shop. This will be used for generating the link to the /newsletter/confirm inside the confirm email. */
      storefrontUrl: string;
      /** Street */
      street?: string;
      /** Zip code */
      tags?: string;
      /** Zip code */
      zipCode?: string;
    };
    response: never;
    responseCode: 200;
  };
  'unsubscribeToNewsletter post /newsletter/unsubscribe': {
    contentType?: 'application/json';
    accept?: 'application/json';
    body: {
      /** Email address that should be removed from the mailing lists. */
      email: string;
    };
    response: never;
    responseCode: 200;
  };
  'readOrder post /order': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: components['schemas']['Criteria'] & {
      /** Check if the payment method of the order is still changeable. */
      checkPromotion?: boolean;
    };
    response: components['schemas']['OrderRouteResponse'];
    responseCode: 200;
  };
  'orderDownloadFile get /order/download/{orderId}/{downloadId}': {
    contentType?: 'application/json';
    accept: 'application/octet-stream';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      orderId: string;
      downloadId: string;
    };
    response: Blob;
    responseCode: 200;
  };
  'orderSetPayment post /order/payment': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** The identifier of the order. */
      orderId: string;
      /** The identifier of the paymentMethod to be set */
      paymentMethodId: string;
    };
    response: components['schemas']['SuccessResponse'];
    responseCode: 200;
  };
  'cancelOrder post /order/state/cancel': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** The identifier of the order to be canceled. */
      orderId: string;
    };
    response: components['schemas']['StateMachineState'];
    responseCode: 200;
  };
  'readPaymentMethod post /payment-method': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: components['schemas']['Criteria'] & {
      /** List only available */
      onlyAvailable?: boolean;
    };
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements?: components['schemas']['PaymentMethod'][];
      /** Total amount */
      total?: number;
    };
    responseCode: 200;
  };
  'readProduct post /product': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['Product'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readProductExport get /product-export/{accessKey}/{fileName}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    pathParams: {
      /** Access Key */
      accessKey: string;
      /** File Name */
      fileName: string;
    };
    response: never;
    responseCode: 200;
  };
  'readProductListing post /product-listing/{categoryId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Determines if the response must contain a SeoUrl entity for a product entity */
      'sw-include-seo-urls'?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of a category. */
      categoryId: string;
    };
    body: components['schemas']['ProductListingCriteria'] & components['schemas']['ProductListingFlags'];
    response: components['schemas']['ProductListingResult'];
    responseCode: 200;
  };
  'readProductDetail post /product/{productId}': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      'sw-include-seo-urls'?: boolean;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    body?: components['schemas']['Criteria'];
    response: components['schemas']['ProductDetailResponse'];
    responseCode: 200;
  };
  'readProductCrossSellings post /product/{productId}/cross-selling': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      'sw-include-seo-urls'?: boolean;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    response: components['schemas']['CrossSellingElementCollection'];
    responseCode: 200;
  };
  'searchProductVariantIds post /product/{productId}/find-variant': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    body: {
      /** The options parameter for the variant to find. */
      options: string[];
      /** The id of the option group that has been switched. */
      switchedGroup?: string;
    };
    response: components['schemas']['FindProductVariantRouteResponse'];
    responseCode: 200;
  };
  'saveProductReview post /product/{productId}/review': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of the product which is reviewed. */
      productId: string;
    };
    body: {
      /** The content of review. */
      content: string;
      /** The email address of the review author. If not set, the email of the customer is chosen. */
      email?: string;
      /** The name of the review author. If not set, the first name of the customer is chosen. */
      name?: string;
      /**
       * Format: double
       * The review rating for the product.
       */
      points: number;
      /** The title of the review. */
      title: string;
    };
    response: never;
    responseCode: 200;
  };
  'readProductReviews post /product/{productId}/reviews': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    pathParams: {
      /** Identifier of the product. */
      productId: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['ProductReview'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readSalutation post /salutation': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements?: components['schemas']['Salutation'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'getScriptStoreApiRoute get /script/{hook}':
    | {
        contentType?: 'application/json';
        accept?: 'application/json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: 'application/json';
        accept: 'application/vnd.api+json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: 'application/json';
        accept?: 'application/json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: never;
        responseCode: 204;
      };
  'postScriptStoreApiRoute post /script/{hook}':
    | {
        contentType?: 'application/json';
        accept?: 'application/json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: 'application/json';
        accept: 'application/vnd.api+json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: 'application/json';
        accept?: 'application/json';
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: never;
        responseCode: 204;
      };
  'searchPage post /search': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      'sw-include-seo-urls'?: boolean;
    };
    body: {
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search: string;
    } & components['schemas']['ProductListingCriteria'] &
      components['schemas']['ProductListingFlags'];
    response: components['schemas']['ProductListingResult'];
    responseCode: 200;
  };
  'searchSuggest post /search-suggest': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body: {
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search: string;
    } & components['schemas']['ProductListingFlags'];
    response: components['schemas']['ProductListingResult'];
    responseCode: 200;
  };
  'readSeoUrl post /seo-url': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    body?: components['schemas']['Criteria'];
    response: {
      elements: components['schemas']['SeoUrl'][];
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readShippingMethod post /shipping-method': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    query?: {
      /** List only available shipping methods. This filters shipping methods methods which can not be used in the actual context because of their availability rule. */
      onlyAvailable?: boolean;
    };
    body?: components['schemas']['Criteria'];
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements?: components['schemas']['ShippingMethod'][];
      /** Total amount */
      total?: number;
    } & components['schemas']['EntitySearchResult'];
    responseCode: 200;
  };
  'readSitemap get /sitemap': {
    contentType?: 'application/json';
    accept?: 'application/json';
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      'sw-language-id'?: string;
    };
    response: components['schemas']['Sitemap'][];
    responseCode: 200;
  };
};
