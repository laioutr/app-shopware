import { ShopwareProductVariantByOptionsQuery } from '../../../shared/tokens/catalog';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { isShopwareId } from '../../shopware-helper/isShopwareId';
import { shopwareErrorStatus } from '../../shopware-helper/shopwareErrors';
import { resolveVariantOptions } from '../../shopware-helper/variantOptions';

/**
 * The variant for a selection, through Shopware's `/product/{productId}/find-variant`. That route
 * takes option ids, which no component hands a storefront, so the product's configurator is read
 * first to turn the selection's names into ids: two reads instead of loading every variant.
 *
 * Shopware answers 404 when no variant matches, which is not found here, as is a selection the
 * configurator does not offer.
 */
export default defineShopwareQuery({
  implements: ShopwareProductVariantByOptionsQuery,
  cache: {
    ttl: '1 hour',
    swr: true,
    staleMaxAge: '1 hour',
  },
  run: async ({ context, input, notFound }) => {
    if (!isShopwareId(input.productId)) return notFound();

    const { storefrontClient } = context;

    const productResponse = await storefrontClient.invoke('readProduct post /product', {
      body: {
        ids: [input.productId],
        associations: { configuratorSettings: { associations: { option: { associations: { group: {} } } } } },
        includes: {
          product: ['id', 'configuratorSettings'],
          product_configurator_setting: ['id', 'option'],
          property_group_option: ['id', 'name', 'translated', 'group'],
          property_group: ['id', 'name', 'translated'],
        },
      },
    });

    const product = productResponse.data.elements?.[0];
    const resolved = product && resolveVariantOptions(product.configuratorSettings ?? [], input.options, input.switchedOption);
    if (!resolved) return notFound();

    try {
      const { data } = await storefrontClient.invoke('searchProductVariantIds post /product/{productId}/find-variant', {
        pathParams: { productId: input.productId },
        body: { options: resolved.optionIds, ...(resolved.switchedGroupId ? { switchedGroup: resolved.switchedGroupId } : {}) },
      });

      const variantId = data.foundCombination?.variantId;
      return variantId ? { id: variantId } : notFound();
    } catch (err) {
      if (shopwareErrorStatus(err) === 404) return notFound();
      throw err;
    }
  },
});
