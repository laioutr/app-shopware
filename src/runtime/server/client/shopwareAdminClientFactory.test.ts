import { afterEach, describe, expect, it, vi } from 'vitest';
import { shopwareAdminClientFactory } from './shopwareAdminClientFactory';

const config = vi.hoisted(() => ({
  adminEndpoint: 'https://shop.example.test/api',
  adminClientId: 'SWIA-ONE',
  adminClientSecret: 'secret',
}));

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ '@laioutr/app-shopware': config }) }));

const answer = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

/** Shopware's Admin API: a token that lasts `expiresIn` seconds, and an empty search. */
const shop = (expiresIn = 600) => {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url;
      calls.push(new URL(url).pathname);
      return url.endsWith('/oauth/token') ? answer({ access_token: `token-${calls.length}`, expires_in: expiresIn }) : answer({ data: [] });
    })
  );
  return calls;
};

const search = () => shopwareAdminClientFactory().invoke('searchProductReview post /search/product-review', { body: {} });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shopwareAdminClientFactory', () => {
  it('asks for a token once for several clients of the same integration', async () => {
    const calls = shop();

    await search();
    await search();

    expect(calls.filter((path) => path.endsWith('/oauth/token'))).toHaveLength(1);
    expect(calls.filter((path) => path.endsWith('/search/product-review'))).toHaveLength(2);
  });

  it('asks again once the token has expired', async () => {
    config.adminClientId = 'SWIA-TWO';
    const calls = shop(0);

    await search();
    await search();

    expect(calls.filter((path) => path.endsWith('/oauth/token'))).toHaveLength(2);
  });

  it('keeps the tokens of two integrations apart', async () => {
    config.adminClientId = 'SWIA-THREE';
    const calls = shop();
    await search();

    config.adminClientId = 'SWIA-FOUR';
    await search();

    expect(calls.filter((path) => path.endsWith('/oauth/token'))).toHaveLength(2);
  });
});
