// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { adoptSession } from './resolveAdoptSession';

const config = { endpoint: 'https://shop.example.com/store-api', accessToken: 'SWSC-access-key' };

describe('adoptSession', () => {
  it('redeems the code and persists the token when a code is present', async () => {
    const adopt = vi.fn().mockResolvedValue('ctx-token-123');
    const persist = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);

    const result = await adoptSession({ config, code: 'one-time-code', adopt, persist, clear });

    expect(adopt).toHaveBeenCalledWith({ endpoint: config.endpoint, accessToken: config.accessToken, code: 'one-time-code' });
    expect(persist).toHaveBeenCalledWith('ctx-token-123');
    expect(clear).not.toHaveBeenCalled();
    expect(result).toEqual({ authenticated: true });
  });

  it('clears the token when no code is present (logout)', async () => {
    const adopt = vi.fn();
    const persist = vi.fn();
    const clear = vi.fn().mockResolvedValue(undefined);

    const result = await adoptSession({ config, code: undefined, adopt, persist, clear });

    expect(clear).toHaveBeenCalledTimes(1);
    expect(adopt).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(result).toEqual({ authenticated: false });
  });

  it('treats an empty-string code as logout', async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    const result = await adoptSession({ config, code: '', adopt: vi.fn(), persist: vi.fn(), clear });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ authenticated: false });
  });
});
