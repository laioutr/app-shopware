import { describe, expect, it, vi } from 'vitest';
import { customFieldsToWrite } from './customerCustomFields';
import type { ShopwareAdminClient } from '../client/shopwareAdminClientFactory';

const adminAnswering = (names: string[]) => {
  const invoke = vi.fn().mockResolvedValue({ data: { data: names.map((name) => ({ name })) } });
  return { invoke, adminClient: { invoke } as unknown as ShopwareAdminClient };
};

describe('customFieldsToWrite', () => {
  it('sends the fields as given from Shopware 6.6, which skips an empty result itself', async () => {
    const { invoke, adminClient } = adminAnswering([]);

    await expect(customFieldsToWrite({ loyalty: 'gold' }, { shopwareVersion: [6, 6, 0, 0], adminClient })).resolves.toEqual({
      loyalty: 'gold',
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sends only the keys the Store API may write to a customer before 6.6', async () => {
    const { invoke, adminClient } = adminAnswering(['loyalty']);

    await expect(
      customFieldsToWrite({ loyalty: 'gold', erp_number: 'K-1' }, { shopwareVersion: [6, 5, 6, 1], adminClient })
    ).resolves.toEqual({ loyalty: 'gold' });
    expect(invoke.mock.calls[0]?.[1].body.filter).toEqual(
      expect.arrayContaining([
        { type: 'equalsAny', field: 'name', value: ['loyalty', 'erp_number'] },
        { type: 'equals', field: 'allowCustomerWrite', value: true },
        { type: 'equals', field: 'customFieldSet.relations.entityName', value: 'customer' },
      ])
    );
  });

  it('sends nothing before 6.6 when no key is writable, which would erase every custom field', async () => {
    const { adminClient } = adminAnswering([]);

    await expect(customFieldsToWrite({ erp_number: 'K-1' }, { shopwareVersion: [6, 5, 6, 1], adminClient })).resolves.toBeUndefined();
  });

  it('sends nothing for an empty bag before 6.6', async () => {
    const { invoke, adminClient } = adminAnswering(['loyalty']);

    await expect(customFieldsToWrite({}, { shopwareVersion: [6, 5, 6, 1], adminClient })).resolves.toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sends nothing when the Admin API cannot tell, also for an unknown version', async () => {
    const adminClient = { invoke: vi.fn().mockRejectedValue(new Error('no credentials')) } as unknown as ShopwareAdminClient;

    await expect(customFieldsToWrite({ loyalty: 'gold' }, { shopwareVersion: undefined, adminClient })).resolves.toBeUndefined();
  });
});
