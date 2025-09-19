import type { ProviderGetImage } from '@nuxt/image';

interface ParsedShopwareThumbnail {
  url: string;
  width: number;
  height: number;
}

/**
 * Allow a tolerance for matching the best thumbnail (in pixels).
 */
const THUMBNAIL_MATCH_TOLERANCE = 2;

/**
 * Find the best matching thumbnail for the given options.
 * Assumes that thumbnails are ordered from smallest to biggest (in width).
 *
 * Best match is determined by being either an image as big or bigger than target-size, preferring the smallest match.
 */
const matchThumbnail = (thumbnails: ParsedShopwareThumbnail[], options: { width?: number; height?: number }) => {
  if (!thumbnails.length) {
    return undefined;
  }

  const { width, height } = options;

  // If there's no specific size, return the biggest thumbnail
  if (!width && !height) {
    return thumbnails.at(-1);
  }

  // Find the first thumbnail that matches the size or is bigger.
  const matchingThumbnail = thumbnails.find((thumbnail) => {
    const thumbnailWidth = Math.max(thumbnail.width - THUMBNAIL_MATCH_TOLERANCE, 0);
    const thumbnailHeight = Math.max(thumbnail.height - THUMBNAIL_MATCH_TOLERANCE, 0);

    if (width && !height && thumbnailWidth >= width) {
      return true;
    }

    if (!width && height && thumbnailHeight >= height) {
      return true;
    }

    if (width && height && thumbnailWidth >= width && thumbnailHeight >= height) {
      return true;
    }

    return false;
  });

  return matchingThumbnail ?? thumbnails.at(-1);
};

/**
 * Nuxt image provider using shopware thumbnails.
 *
 * The only modifications supported are "width" and "height". The provider tries to find a best-fit image from the available shopware thumbnails.
 */
export const getImage: ProviderGetImage = (src, options = {}) => {
  // TODO memoize last calculated sizes
  const [orgSrc, rawThumbnailSrc] = src.split('#');
  const thumbnailSrc = decodeURIComponent(rawThumbnailSrc ?? '');
  const thumbnails =
    thumbnailSrc ?
      thumbnailSrc
        .split(', ')
        .map((thumbnail) => {
          const [url, size] = thumbnail.split(' ');
          const [width, height] = size
            ?.split('x')
            .map(Number.parseInt)
            .filter((num) => !Number.isNaN(num)) ?? [0, 0];

          return {
            url,
            width: width ?? height ?? 0,
            height: height ?? width ?? 0,
          };
        })
        .sort((a, b) => a.width - b.width)
    : [];

  const match = matchThumbnail(thumbnails, options.modifiers ?? {});

  return {
    url: match?.url ?? orgSrc,
    width: match?.width ?? 0,
    height: match?.height ?? 0,
  };
};
