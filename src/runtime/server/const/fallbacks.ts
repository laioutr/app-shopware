import { MediaImage } from '@laioutr-core/canonical-types';

export const FALLBACK_IMAGE_URL = 'https://cdn.shopware.store/a/B/m/pPkDE/media/b1/48/d9/SW10069.jpg?ts=1596695192';

export const FALLBACK_IMAGE: MediaImage = {
  type: 'image',
  sources: [
    {
      provider: 'none',
      width: 1010,
      height: 730,
      src: FALLBACK_IMAGE_URL,
    },
  ],
} as const;

export const FALLBACK_CURRENCY_CODE = 'EUR';
export const FALLBACK_CURRENCY_DECIMAL_DIGITS = 2;
