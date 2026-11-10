import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineShopware, type ShopwareOrchestrContext } from './defineShopware';
import type { ShopwareCriteria, ShopwareCriteriaTarget } from '../types/criteria';
import type { CustomFieldsConfig } from '../types/customFields';

type CriteriaHandler = (args: { target: ShopwareCriteriaTarget; result: { criteria: ShopwareCriteria } }) => void;

const nitro = vi.hoisted(() => ({
  criteriaHandlers: [] as CriteriaHandler[],
  config: { customFields: undefined as CustomFieldsConfig | undefined },
}));

vi.mock('#imports', () => ({
  defineOrchestr: { meta: () => ({ extendRequest: (run: unknown) => ({ run }) }) },
  useNitroApp: () => ({
    hooks: {
      callHook: async (name: string, args: Parameters<CriteriaHandler>[0]) => {
        if (name !== 'shopware:criteria:resolve') return;
        for (const handler of nitro.criteriaHandlers) handler(args);
      },
    },
  }),
  useRuntimeConfig: () => ({ '@laioutr/app-shopware': nitro.config }),
}));
vi.mock('../context/getShopwareContext', () => ({ getShopwareContext: async () => ({}) }));
vi.mock('../client/shopwareAdminClientFactory', () => ({ shopwareAdminClientFactory: () => ({}) }));
vi.mock('../shopware-helper/system/getShopwareVersion', () => ({ getCachedShopwareVersion: async () => undefined }));
vi.mock('../shopware-helper/system/getCategoryRoots', () => ({
  getCachedCategoryRoots: async () => ({ navigation: 'main-root', footer: 'footer-root' }),
}));

const contextOf = async () => {
  const { run } = defineShopware as unknown as { run: (args: unknown) => Promise<{ context: ShopwareOrchestrContext }> };
  return (await run({ event: {}, clientEnv: {} })).context;
};

beforeEach(() => {
  nitro.criteriaHandlers.length = 0;
  nitro.config.customFields = undefined;
});

describe('resolveCriteria', () => {
  it('projects the whitelisted column after a handler narrowed the read', async () => {
    nitro.config.customFields = { category: { include: ['teaser'] } };
    nitro.criteriaHandlers.push(({ result }) => {
      result.criteria.includes.category = ['id', 'translated'];
    });

    const { resolveCriteria } = await contextOf();
    const criteria = await resolveCriteria('category', { includes: {}, associations: {} });

    expect(criteria.includes.category).toEqual(['id', 'translated', 'customFields']);
  });

  it('hands a handler the read without the column', async () => {
    nitro.config.customFields = { product: { include: ['energyLabel'] } };
    const seen: string[][] = [];
    nitro.criteriaHandlers.push(({ result }) => {
      seen.push([...(result.criteria.includes.product ?? [])]);
    });

    const { resolveCriteria } = await contextOf();
    const criteria = await resolveCriteria('product', { includes: { product: ['id'] }, associations: {} });

    expect(seen).toEqual([['id']]);
    expect(criteria.includes.product).toEqual(['id', 'customFields']);
  });
});

describe('categoryRoots', () => {
  it("carries the sales channel's category roots", async () => {
    const { categoryRoots } = await contextOf();

    expect(categoryRoots).toEqual({ navigation: 'main-root', footer: 'footer-root' });
  });
});
