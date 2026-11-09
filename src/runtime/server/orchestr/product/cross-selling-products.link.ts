import { ShopwareProductCrossSellingProductsLink } from '../../../shared/tokens/cross-selling';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { crossSellingSourceIdOf, passProductTargets } from '../../orchestr-helper/productTargets';
import { productTargetsOf } from '../../shopware-helper/productTargets';
import { readCrossSellings } from '../../shopware-helper/readCrossSellings';

/**
 * Every cross-selling product of a product as one list, for a section that is bound to the product
 * page's product and can follow a link but not pick a group. Groups come in the shop's order, each
 * product once, at its first group.
 */
export default defineShopwareLink({
  implements: ShopwareProductCrossSellingProductsLink,
  run: async ({ entityIds, context, passthrough, pagination }) => {
    const sources = [...new Set(entityIds)].map((productId) => ({ productId, askedId: crossSellingSourceIdOf(passthrough, productId) }));
    const groupsByAskedId = await readCrossSellings(
      context.storefrontClient,
      sources.map(({ askedId }) => askedId)
    );

    const defaultVariantIds: Record<string, string> = {};
    const links = sources.flatMap(({ productId, askedId }) => {
      const groups = groupsByAskedId.get(askedId);
      if (!groups) return [];

      const targets = productTargetsOf(
        groups.flatMap((group) => group.products),
        [productId, askedId]
      );
      const page = targets.targetIds.slice(pagination.offset, pagination.offset + pagination.limit);
      for (const targetId of page) defaultVariantIds[targetId] ??= targets.defaultVariantIds[targetId]!;

      return [{ sourceId: productId, targetIds: page, entityTotal: targets.targetIds.length }];
    });

    passProductTargets(passthrough, defaultVariantIds);
    return { links };
  },
});
