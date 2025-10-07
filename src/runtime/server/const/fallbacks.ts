import { MediaImage } from '@laioutr-core/canonical-types';

export const FALLBACK_IMAGE_URL = '/app-shopware/image-placeholder.svg';

export const FALLBACK_IMAGE: MediaImage = {
  type: 'image',
  sources: [
    {
      provider: 'none',
      width: 200,
      height: 200,
      src: FALLBACK_IMAGE_URL,
    },
  ],
} as const;

export const FALLBACK_CURRENCY_CODE = 'EUR';
export const FALLBACK_CURRENCY_DECIMAL_DIGITS = 2;
