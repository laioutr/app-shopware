import { ProductByIdQuery } from '@laioutr-core/canonical-types/ecommerce';
import { useGetProductParentId } from '../../composable/useGetProductParentId';
import { parentIdToDefaultVariantIdToken } from '../../const/passthroughTokens';
import { defineShopwareQuery } from '../../middleware/defineShopware';
import { isShopwareId } from '../../shopware-helper/isShopwareId';

/**
 * A product named by its Shopware id, which a storefront keeps where a slug would change, such as a
 * wishlist entry.
 *
 * A variant's id answers its product with that variant selected, as a slug of the variant does. The
 * product resolver loads the product and reports an id Shopware does not return as not found; an id
 * that is not a Shopware id at all is not found without asking Shopware.
 */
export default defineShopwareQuery({
  implements: ProductByIdQuery,
  run: async ({ context, input, passthrough, notFound }) => {
    if (!isShopwareId(input.id)) return notFound();

    const parentId = await useGetProductParentId(context.storefrontClient)(input.id);
    if (!parentId) return { id: input.id };

    passthrough.set(parentIdToDefaultVariantIdToken, { [parentId]: input.id });
    return { id: parentId };
  },
});
