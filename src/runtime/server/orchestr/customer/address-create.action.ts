import { CustomerAddressCreateAction } from '@laioutr-core/canonical-types/ecommerce';
import type { Schemas } from '../../types/storeApiTypes';
import { defineShopwareAction } from '../../middleware/defineShopware';
import { resolveAddressIds, toShopwareAddressBody } from '../../shopware-helper/mailingAddress';
import { accountCall, bodyFieldOfColumn } from '../../shopware-helper/shopwareErrors';

export default defineShopwareAction(CustomerAddressCreateAction, async ({ context, input }) => {
  const ids = await resolveAddressIds(context.storefrontClient, context.systemEntities, input.address, {
    fieldPrefix: ['address'],
    complete: true,
  });
  const body = toShopwareAddressBody(input.address, ids) as Schemas['CustomerAddressBody'];

  await accountCall(() => context.storefrontClient.invoke('createCustomerAddress post /account/address', { body }), {
    fieldPrefix: ['address'],
    columnPointer: bodyFieldOfColumn,
  });
});
