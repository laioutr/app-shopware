import { describe, expect, it, vi } from 'vitest';
import clear from './clear.action';

vi.mock('../../middleware/defineShopware', () => ({ defineShopwareAction: (_token: unknown, run: unknown) => run }));

type Run = (args: Record<string, unknown>) => Promise<unknown>;

describe('ShopwareCartClearAction', () => {
  it("deletes the session's cart", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: undefined });

    await (clear as unknown as Run)({ context: { contextToken: 'token', storefrontClient: { invoke } } });

    expect(invoke).toHaveBeenCalledWith('deleteCart delete /checkout/cart');
  });

  it('sends nothing for a visitor without a session', async () => {
    const invoke = vi.fn();

    await (clear as unknown as Run)({ context: { contextToken: undefined, storefrontClient: { invoke } } });

    expect(invoke).not.toHaveBeenCalled();
  });
});
