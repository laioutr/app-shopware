import { consola } from 'consola';
import { ShopwareCrossSellingProductsLink } from '../../../shared/tokens/cross-selling';
import { crossSellingGroupsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { passProductTargets } from '../../orchestr-helper/productTargets';
import { productTargetsOf } from '../../shopware-helper/productTargets';

const logger = consola.withTag('shopware/cross-selling');

/**
 * The products of a cross-selling group, in the group's own sorting. A group is only reached through
 * its product's groups link, which leaves the rows it read in the passthrough; Shopware has no read of
 * a group by its id.
 */
export default defineShopwareLink({
  implements: ShopwareCrossSellingProductsLink,
  run: async ({ entityIds, passthrough, pagination }) => {
    const rowsByGroup = passthrough.get(crossSellingGroupsToken) ?? {};

    const defaultVariantIds: Record<string, string> = {};
    const links = [...new Set(entityIds)].flatMap((groupId) => {
      const group = rowsByGroup[groupId];
      if (!group) {
        logger.warn(`Cross-selling group ${groupId} was not read in this request, so it links no products.`);
        return [];
      }

      const targets = productTargetsOf(group.products, group.productIds);
      const page = targets.targetIds.slice(pagination.offset, pagination.offset + pagination.limit);
      for (const targetId of page) defaultVariantIds[targetId] ??= targets.defaultVariantIds[targetId]!;

      return [{ sourceId: groupId, targetIds: page, entityTotal: targets.targetIds.length }];
    });

    passProductTargets(passthrough, defaultVariantIds);
    return { links };
  },
});
