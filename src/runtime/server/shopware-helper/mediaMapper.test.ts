// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapMedia, mediaToSrc } from './mediaMapper';
import { Media } from '@laioutr-core/core-types/common';
import { getImage } from '../../app/image/providers/shopware';

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

// Shopware can deliver media URLs with literal (unencoded) spaces in the
// filename, e.g. `.../1672993996/Erdbeertraum mit Ranke.png?width=450`. The
// composite src format is space-delimited (`<url> <w>x<h>, ...`), so an
// unencoded space corrupts it: the image provider truncates the URL at the
// first space and the browser 404s.
const swMediaWithSpaces = {
  mimeType: 'image/png',
  alt: null,
  url: 'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum mit Ranke.png?width=3000',
  thumbnails: [
    { url: 'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum mit Ranke.png?width=450', width: 450, height: 450 },
    { url: 'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum mit Ranke.png?width=1024', width: 1024, height: 1024 },
  ],
  metaData: { width: 856, height: 1112 },
};

describe('mediaToSrc', () => {
  it('percent-encodes spaces in media and thumbnail URLs so the space-delimited fragment stays parseable', () => {
    const src = mediaToSrc(swMediaWithSpaces as never);
    const [orgSrc, rawFragment] = src.split('#');

    expect(orgSrc).toBe('https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=3000');

    const entries = decodeURIComponent(rawFragment).split(', ');
    expect(entries).toEqual([
      'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=450 450x450',
      'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=1024 1024x1024',
      'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=3000 856x1112',
    ]);
  });

  it('leaves already-encoded URLs untouched (no double encoding)', () => {
    const src = mediaToSrc({
      ...swMediaWithSpaces,
      url: 'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=3000',
      thumbnails: [],
    } as never);

    expect(src.split('#')[0]).toBe(
      'https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=3000',
    );
  });

  it('round-trips through the shopware image provider without truncating at spaces', () => {
    const src = mediaToSrc(swMediaWithSpaces as never);
    // The provider returns width/height alongside the url, beyond what
    // @nuxt/image's ResolvedImage declares.
    const image = getImage(src, { modifiers: { width: 400 } } as never, {} as never) as {
      url: string;
      width: number;
      height: number;
    };

    expect(image.url).toBe('https://cdn.example/media/2a/3c/c2/1672993996/Erdbeertraum%20mit%20Ranke.png?width=450');
    expect(image.width).toBe(450);
    expect(image.height).toBe(450);
  });
});
