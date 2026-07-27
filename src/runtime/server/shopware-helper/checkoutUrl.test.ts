// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildConnectSessionUrl } from './checkoutUrl';

describe('buildConnectSessionUrl', () => {
  it('builds a connect-session URL carrying only the opaque code', () => {
    const url = buildConnectSessionUrl({ storefrontUrl: 'https://shop.example.com', code: 'abc123' });

    expect(url).toBe('https://shop.example.com/laioutr/connect-session?code=abc123');
  });

  it('URL-encodes the code', () => {
    const url = buildConnectSessionUrl({ storefrontUrl: 'https://shop.example.com', code: 'a b/c+d=' });

    expect(url).toBe('https://shop.example.com/laioutr/connect-session?code=a+b%2Fc%2Bd%3D');
  });

  it('trims a trailing slash from the storefront URL', () => {
    const url = buildConnectSessionUrl({ storefrontUrl: 'https://shop.example.com/', code: 'x' });

    expect(url).toBe('https://shop.example.com/laioutr/connect-session?code=x');
  });
});
