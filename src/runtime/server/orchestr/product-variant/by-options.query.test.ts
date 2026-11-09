import { beforeEach, describe, expect, it, vi } from 'vitest';
import byOptions from './by-options.query';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareQuery: (definition: unknown) => definition }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const PRODUCT_ID = '0190a4b7c3d27a8e9f1b2c3d4e5f6a7b';
const NOT_FOUND = Symbol('not found');

const apiError = (status: number, errors: unknown[] = []) => Object.assign(new Error('Failed request'), { status, details: { errors } });

const option = (id: string, name: string, groupId: string, groupName: string) => ({
  option: { id, name, translated: { name }, group: { id: groupId, name: groupName, translated: { name: groupName } } },
});

const product = {
  id: PRODUCT_ID,
  configuratorSettings: [
    option('opt-red', 'Red', 'grp-color', 'Color'),
    option('opt-blue', 'Blue', 'grp-color', 'Color'),
    option('opt-m', 'M', 'grp-size', 'Size'),
  ],
};

const invoke = vi.fn();
const run = (input: unknown) =>
  (byOptions as unknown as { run: Run }).run({ context: { storefrontClient: { invoke } }, input, notFound: () => NOT_FOUND });

const respond = (findVariant: unknown) =>
  invoke.mockImplementation(async (operation: string) => {
    if (operation === 'readProduct post /product') return { data: { elements: [product] } };
    if (findVariant instanceof Error) throw findVariant;
    return { data: findVariant };
  });

beforeEach(() => {
  invoke.mockReset();
});

describe('ShopwareProductVariantByOptionsQuery', () => {
  it("answers the variant Shopware finds for the selection's option ids", async () => {
    respond({ foundCombination: { variantId: 'variant-blue-m', options: ['opt-blue', 'opt-m'] } });

    await expect(
      run({
        productId: PRODUCT_ID,
        options: [
          { name: 'Color', value: 'Blue' },
          { name: 'Size', value: 'M' },
        ],
        switchedOption: 'Color',
      })
    ).resolves.toEqual({ id: 'variant-blue-m' });

    expect(invoke).toHaveBeenCalledWith('searchProductVariantIds post /product/{productId}/find-variant', {
      pathParams: { productId: PRODUCT_ID },
      body: { options: ['opt-blue', 'opt-m'], switchedGroup: 'grp-color' },
    });
  });

  it('answers not found when no variant matches', async () => {
    respond(apiError(404, [{ code: 'CONTENT__PRODUCT_VARIANT_NOT_FOUND' }]));

    await expect(run({ productId: PRODUCT_ID, options: [{ name: 'Color', value: 'Red' }] })).resolves.toBe(NOT_FOUND);
  });

  it('answers not found for a value the product does not offer, without asking for a variant', async () => {
    respond({});

    await expect(run({ productId: PRODUCT_ID, options: [{ name: 'Color', value: 'Green' }] })).resolves.toBe(NOT_FOUND);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('answers not found for an id that is no Shopware id, without asking Shopware', async () => {
    await expect(run({ productId: 'not-an-id', options: [{ name: 'Color', value: 'Red' }] })).resolves.toBe(NOT_FOUND);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('passes an outage on', async () => {
    const outage = apiError(503);
    respond(outage);

    await expect(run({ productId: PRODUCT_ID, options: [{ name: 'Color', value: 'Red' }] })).rejects.toBe(outage);
  });
});
