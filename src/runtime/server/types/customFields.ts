/** `cart` whitelists the cart's `extensions`, which plugins such as a minimum-order-value rule fill; a cart has no custom fields. */
export type CustomFieldsEntity = 'product' | 'variant' | 'category' | 'customer' | 'cart';

export interface CustomFieldsWhitelist {
  /** Custom-field keys to expose; `*` matches any run of characters (`gpsr_*`, or `*` for all). */
  include: string[];
}

/** Shopware custom fields mapped into the canonical `customFields` slots, per entity. */
export type CustomFieldsConfig = Partial<Record<CustomFieldsEntity, CustomFieldsWhitelist>>;
