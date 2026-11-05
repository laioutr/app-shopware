import { beforeEach, describe, expect, it, vi } from 'vitest';
import subscribe from './subscribe.action';

const config: { storefrontUrl?: string } = {};

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ '@laioutr/app-shopware': config }) }));
vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, run: unknown) => run }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

const context = {
  storefrontClient: { invoke: vi.fn().mockResolvedValue({ data: undefined }) },
  currentSystemEntities: { locale: { languageId: 'lang-de' } },
  systemEntities: { salutations: [{ id: 'sal-mrs', key: 'mrs' }] },
};

const bodySent = () => context.storefrontClient.invoke.mock.calls[0]?.[1].body;

beforeEach(() => {
  context.storefrontClient.invoke.mockClear();
  config.storefrontUrl = 'https://shop.example.com';
});

describe('newsletter subscribe', () => {
  it('forwards custom fields and maps the person', async () => {
    await expect(
      (subscribe as unknown as Run)({
        context,
        input: { email: 'ada@example.com', person: { firstName: 'Ada', salutation: 'mrs' }, customFields: { signupSource: 'footer' } },
      })
    ).resolves.toEqual({ status: 'success' });

    expect(bodySent()).toMatchObject({ firstName: 'Ada', salutationId: 'sal-mrs', customFields: { signupSource: 'footer' } });
  });

  it('answers error without a storefront URL', async () => {
    config.storefrontUrl = undefined;

    await expect((subscribe as unknown as Run)({ context, input: { email: 'ada@example.com' } })).resolves.toEqual({ status: 'error' });
    expect(context.storefrontClient.invoke).not.toHaveBeenCalled();
  });
});
