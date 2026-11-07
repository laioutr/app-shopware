import { describe, expect, it } from 'vitest';
import { manufacturerLink, mapManufacturerBrand } from './manufacturerMapper';
import type { ShopwareManufacturer } from '../types/shopware';

describe('manufacturerLink', () => {
  it('opens an absolute website in a new tab', () => {
    expect(manufacturerLink('http://www.deutschesee.de/')).toEqual({ type: 'url', href: 'http://www.deutschesee.de/', target: '_blank' });
  });

  it('takes a link without a scheme as https', () => {
    expect(manufacturerLink(' www.example.com/brand ')).toEqual({ type: 'url', href: 'https://www.example.com/brand', target: '_blank' });
  });

  it('drops anything that is no http(s) URL', () => {
    expect(manufacturerLink(undefined)).toBeUndefined();
    expect(manufacturerLink('')).toBeUndefined();
    expect(manufacturerLink('javascript:alert(1)')).toBeUndefined();
    expect(manufacturerLink('mailto:info@example.com')).toBeUndefined();
    expect(manufacturerLink('not a url')).toBeUndefined();
  });
});

describe('mapManufacturerBrand', () => {
  it('reads the translated name and link', () => {
    const manufacturer = {
      name: 'Deutsche See',
      link: 'http://old.example.com',
      translated: { name: 'Deutsche See GmbH', link: 'https://www.deutschesee.de' },
    } as unknown as ShopwareManufacturer;

    expect(mapManufacturerBrand(manufacturer)).toEqual({
      name: 'Deutsche See GmbH',
      link: { type: 'url', href: 'https://www.deutschesee.de/', target: '_blank' },
    });
  });

  it('is empty without a manufacturer', () => {
    expect(mapManufacturerBrand(undefined)).toEqual({ name: undefined, link: undefined });
    expect(mapManufacturerBrand(null)).toEqual({ name: undefined, link: undefined });
  });
});
