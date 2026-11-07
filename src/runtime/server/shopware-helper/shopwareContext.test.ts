import { describe, expect, it } from 'vitest';
import { isAdminConfigured, toStoreApiHeaders } from './shopwareContext';
import type { ClientHeaders } from '../types/shopware';

describe('isAdminConfigured', () => {
  it('needs the endpoint and both credentials', () => {
    expect(isAdminConfigured({ adminEndpoint: 'https://shop/api', adminClientId: 'id', adminClientSecret: 'secret' })).toBe(true);
    expect(isAdminConfigured({ adminEndpoint: 'https://shop/api', adminClientId: 'id', adminClientSecret: '' })).toBe(false);
    expect(isAdminConfigured({ adminClientId: 'id', adminClientSecret: 'secret' })).toBe(false);
  });
});

describe('toStoreApiHeaders', () => {
  it('copies the string headers and drops cleared ones and the proxy method', () => {
    const headers = {
      'sw-access-key': 'SWSC',
      'sw-context-token': 'token',
      'sw-language-id': undefined,
      'sw-currency-id': '',
      apply: () => {},
    } as unknown as ClientHeaders;

    expect(toStoreApiHeaders(headers)).toEqual({ 'sw-access-key': 'SWSC', 'sw-context-token': 'token' });
  });
});
