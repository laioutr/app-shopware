import { consola } from 'consola';
import { isAtLeast, type ShopwareVersion } from './shopwareVersion';
import type { ShopwareAdminClient } from '../client/shopwareAdminClientFactory';

const logger = consola.withTag('shopware/customer');

/**
 * The custom fields of a profile update that are safe to send to `/account/change-profile`.
 *
 * Shopware keeps only the keys the shop lets the Store API write to a customer, and before 6.6.10.5
 * it stores an empty result as `{}`, which erases every custom field the customer has, the
 * merchant's own included. From 6.6.10.5 Shopware skips an empty result, so there the fields travel as
 * given. Before it, and for a shop whose version is unknown, the Admin API tells which keys are
 * writable and only those are sent; without the Admin API none are, rather than risk the erasure.
 */
export const customFieldsToWrite = async (
  fields: Record<string, unknown>,
  { shopwareVersion, adminClient }: { shopwareVersion: ShopwareVersion | undefined; adminClient: ShopwareAdminClient }
): Promise<Record<string, unknown> | undefined> => {
  if (isAtLeast(shopwareVersion, '6.6.10.5')) return fields;

  const keys = Object.keys(fields);
  if (keys.length === 0) return undefined;

  let writable: Set<string>;
  try {
    const response = await adminClient.invoke('searchCustomField post /search/custom-field', {
      body: {
        filter: [
          { type: 'equalsAny', field: 'name', value: keys },
          { type: 'equals', field: 'allowCustomerWrite', value: true },
          { type: 'equals', field: 'customFieldSet.relations.entityName', value: 'customer' },
        ],
        includes: { custom_field: ['name'] },
      },
    });
    writable = new Set((response.data.data ?? []).map((field: { name: string }) => field.name));
  } catch (error) {
    logger.warn('Customer custom fields not written: before Shopware 6.6.10.5 the Admin API must tell which are writable', {
      keys,
      error: (error as Error).message,
    });
    return undefined;
  }

  const kept = Object.fromEntries(Object.entries(fields).filter(([key]) => writable.has(key)));
  return Object.keys(kept).length > 0 ? kept : undefined;
};
