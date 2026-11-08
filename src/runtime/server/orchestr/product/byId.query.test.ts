import { beforeEach, describe, expect, it, vi } from 'vitest';
import productById from './byId.query';

const parentIdOf = vi.fn<(id: string) => Promise<string | undefined>>();

// The handler reaches Nuxt's auto-imports through these modules, which a plain node run cannot resolve.
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareQuery: (handler: { run: unknown }) => handler.run }));
vi.mock('../../const/passthroughTokens', () => ({ parentIdToDefaultVariantIdToken: 'parentIdToDefaultVariantId' }));
vi.mock('../../composable/useGetProductParentId', () => ({ useGetProductParentId: () => parentIdOf }));

const PRODUCT_ID = '0123456789abcdef0123456789abcdef';
const VARIANT_ID = 'fedcba9876543210fedcba9876543210';
const NOT_FOUND = { notFound: 'sentinel' };

const run = (id: string) => {
  const passthrough = new Map<string, unknown>();
  const answer = (productById as unknown as (args: unknown) => Promise<unknown>)({
    input: { id },
    context: { storefrontClient: {} },
    passthrough: { set: (key: string, value: unknown) => passthrough.set(key, value) },
    notFound: () => NOT_FOUND,
  });
  return { answer, passthrough };
};

beforeEach(() => {
  parentIdOf.mockReset();
});

describe('ProductByIdQuery', () => {
  it("answers a product's own id", async () => {
    parentIdOf.mockResolvedValue(undefined);
    const { answer, passthrough } = run(PRODUCT_ID);

    await expect(answer).resolves.toEqual({ id: PRODUCT_ID });
    expect(passthrough.size).toBe(0);
  });

  it("answers a variant's id with its product and selects that variant", async () => {
    parentIdOf.mockResolvedValue(PRODUCT_ID);
    const { answer, passthrough } = run(VARIANT_ID);

    await expect(answer).resolves.toEqual({ id: PRODUCT_ID });
    expect(passthrough.get('parentIdToDefaultVariantId')).toEqual({ [PRODUCT_ID]: VARIANT_ID });
  });

  it('answers an id that is not a Shopware id as not found, without asking Shopware', async () => {
    await expect(run('gid://shopify/Product/1').answer).resolves.toBe(NOT_FOUND);
    expect(parentIdOf).not.toHaveBeenCalled();
  });
});
