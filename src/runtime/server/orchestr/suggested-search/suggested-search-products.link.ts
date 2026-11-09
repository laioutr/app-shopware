import { SuggestedSearchProductsLink } from '@laioutr-core/canonical-types/suggested-search';
import { suggestionResultsFragmentToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { passProductTargets } from '../../orchestr-helper/productTargets';
import { productTargetsOf } from '../../shopware-helper/productTargets';

/**
 * The suggestion's products as `Product` entities, so a flyout renders them with price and image like
 * any listing tile, each showing the variant Shopware suggested.
 */
export default defineShopwareLink(SuggestedSearchProductsLink, async ({ passthrough }) => {
  const results = passthrough.require(suggestionResultsFragmentToken);
  const { targetIds, defaultVariantIds } = productTargetsOf(results.products);

  passProductTargets(passthrough, defaultVariantIds);

  return { links: [{ sourceId: results.id, targetIds }] };
});
