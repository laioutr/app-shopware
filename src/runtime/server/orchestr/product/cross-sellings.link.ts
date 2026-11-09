import { ProductCrossSellingBase, ShopwareProductCrossSellingsLink } from '../../../shared/tokens/cross-selling';
import { crossSellingGroupsToken } from '../../const/passthroughTokens';
import { defineShopwareLink } from '../../middleware/defineShopware';
import { crossSellingSourceIdOf } from '../../orchestr-helper/productTargets';
import { readCrossSellings } from '../../shopware-helper/readCrossSellings';

/**
 * A product's cross-selling groups, answered inline: Shopware offers no read of a group by its id, so
 * there is no resolver to hand them to. The groups' rows stay in the passthrough for the products link
 * nested under this one.
 */
export default defineShopwareLink({
  implements: ShopwareProductCrossSellingsLink,
  provides: [ProductCrossSellingBase],
  run: async ({ entityIds, context, passthrough, pagination, $entity }) => {
    const sources = [...new Set(entityIds)].map((productId) => ({ productId, askedId: crossSellingSourceIdOf(passthrough, productId) }));
    const groupsByAskedId = await readCrossSellings(
      context.storefrontClient,
      sources.map(({ askedId }) => askedId)
    );

    const rowsByGroup = { ...passthrough.get(crossSellingGroupsToken) };
    const links = sources.flatMap(({ productId, askedId }) => {
      const groups = groupsByAskedId.get(askedId);
      if (!groups) return [];

      for (const group of groups) rowsByGroup[group.id] = { productIds: [productId, askedId], products: group.products };

      const offset = pagination?.offset ?? 0;
      const page = pagination ? groups.slice(offset, offset + pagination.limit) : groups;
      return [
        {
          sourceId: productId,
          entities: page.map((group) => $entity({ id: group.id, base: { name: group.name, position: group.position, type: group.type } })),
          entityTotal: groups.length,
        },
      ];
    });

    passthrough.set(crossSellingGroupsToken, rowsByGroup);
    return { links };
  },
});
