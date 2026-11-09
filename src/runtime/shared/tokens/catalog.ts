import { z } from 'zod/v4';
import { defineQueryToken } from '@laioutr-core/core-types/orchestr';

/**
 * The variant of a product that carries a combination of option values, for a variant selector on a
 * product with more variants than the page should load (Shopware `/product/{productId}/find-variant`).
 *
 * Options are named the way the product's `optionGroups` and a variant's `options` name them: the
 * axis `name` and the `value`, both in the request's language. `switchedOption` names the axis the
 * visitor just changed. When no variant carries the full combination, Shopware then answers the
 * closest variant that keeps the switched value, so the selector moves instead of dead-ending; the
 * answer's `options` component tells which values it actually has. Without it, a combination no
 * variant carries is not found, as is an axis or value the product does not offer.
 *
 * @public
 */
export const ShopwareProductVariantByOptionsQuery = defineQueryToken('shopware/product-variant/by-options', {
  entity: 'ProductVariant',
  type: 'single',
  label: 'Product variant by options (Shopware)',
  input: z.object({
    productId: z.string().meta({ description: 'The id of the product, as its `Product` entity carries it.' }),
    options: z
      .array(
        z.object({
          name: z.string().meta({ description: 'The axis, e.g. "Size", as `optionGroups` names it.' }),
          value: z.string().meta({ description: 'The value on that axis, e.g. "M".' }),
        })
      )
      .min(1),
    switchedOption: z.string().optional().meta({ description: 'The `name` of the axis the visitor changed last.' }),
  }),
});
