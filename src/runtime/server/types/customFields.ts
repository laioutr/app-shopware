export type CustomFieldsEntity = 'product' | 'variant';

export interface CustomFieldsWhitelist {
  /** Custom-field keys to expose; `*` matches any run of characters (`gpsr_*`, or `*` for all). */
  include: string[];
}

/** Shopware custom fields mapped into the canonical `customFields` slots, per entity. */
export type CustomFieldsConfig = Partial<Record<CustomFieldsEntity, CustomFieldsWhitelist>>;
