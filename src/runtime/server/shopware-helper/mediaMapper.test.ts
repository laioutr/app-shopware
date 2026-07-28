// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapMedia } from './mediaMapper';
import { Media } from '@laioutr-core/core-types/common';

// A Shopware admin `/search/media` row for an image asset with no `alt` set.
// Shopware types `alt` as `string` but the API returns `null` at runtime — the
// exact shape that used to make every unset-alt asset fail the canonical Media
// schema and get dropped by the media-library trust boundary (empty file list).
const swImageRow = {
  mimeType: 'image/svg+xml',
  alt: null,
  url: 'http://localhost:8000/media/82/2e/e8/swag_paypal_paypal.svg',
  thumbnails: [],
  metaData: { width: 34, height: 24 },
};

describe('mapMedia', () => {
  it('coalesces a null `alt` to undefined so the result passes canonical Media validation', () => {
    const result = mapMedia(swImageRow as never);

    expect(result.alt).toBeUndefined();
    // The real regression guard: wrapProvider.sanitizeProviderItem runs exactly
    // this parse and drops the item (→ empty file list) when it fails.
    expect(Media.safeParse(result).success).toBe(true);
  });

  it('preserves a real `alt` string', () => {
    const result = mapMedia({ ...swImageRow, alt: 'PayPal logo' } as never);

    expect(result.alt).toBe('PayPal logo');
    expect(Media.safeParse(result).success).toBe(true);
  });

  it('falls back to `title` when `alt` is unset (null or blank)', () => {
    expect(mapMedia({ ...swImageRow, alt: null, title: 'PayPal' } as never).alt).toBe('PayPal');
    expect(mapMedia({ ...swImageRow, alt: '', title: 'PayPal' } as never).alt).toBe('PayPal');
  });

  it('prefers `alt` over `title` when both are set', () => {
    expect(mapMedia({ ...swImageRow, alt: 'Alt text', title: 'PayPal' } as never).alt).toBe('Alt text');
  });
});
