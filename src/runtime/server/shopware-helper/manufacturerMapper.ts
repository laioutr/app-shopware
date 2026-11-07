import { swTranslated } from './swTranslated';
import type { ShopwareManufacturer } from '../types/shopware';
import type { LinkUrl } from '@laioutr-core/core-types/common';

/**
 * The manufacturer's website, which merchants type by hand: `www.example.com` is common, so a missing
 * scheme is taken as https. Anything that still is no http(s) URL is dropped rather than rendered as a
 * relative link into the storefront.
 */
export const manufacturerLink = (raw: string | null | undefined): LinkUrl | undefined => {
  const value = raw?.trim();
  if (!value) return undefined;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return { type: 'url', href: url.toString(), target: '_blank' };
  } catch {
    return undefined;
  }
};

export const mapManufacturerBrand = (manufacturer: ShopwareManufacturer | null | undefined) => ({
  name: swTranslated(manufacturer ?? undefined, 'name') || undefined,
  link: manufacturerLink(swTranslated(manufacturer ?? undefined, 'link')),
});
