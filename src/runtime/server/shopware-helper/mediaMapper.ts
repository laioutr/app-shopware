import { Media, MediaSourceImage, MediaSourceVideo } from '@laioutr-core/core-types/common';
import { FALLBACK_IMAGE, FALLBACK_IMAGE_URL } from '../const/fallbacks';
import { Schemas } from '../types/storeApiTypes';

type SwMedia = Schemas['Media'];

// Shopware can deliver media URLs with literal (unencoded) spaces in the
// filename. The composite format below is space-delimited, so a raw space
// would make the image provider truncate the URL at the first space.
const encodeSpaces = (url: string) => url.replaceAll(' ', '%20');

// Source and thumbnails are encoded in a valid url like this:
// /original-source.jpg#/thumbnail-1.jpg 100x100, /thumbnail-2.jpg 200x200
export const mediaToSrc = (media: SwMedia) => {
  if ((!media.thumbnails || media.thumbnails.length === 0) && !media.url) {
    return FALLBACK_IMAGE_URL;
  }

  const thumbnails = media.thumbnails ?? [];
  const thumbnailSrc = thumbnails.map((thumb) => `${encodeSpaces(thumb.url)} ${thumb.width}x${thumb.height}`);
  const mediaUrl = encodeSpaces(media.url);
  const orgSrc = `${mediaUrl} ${media.metaData?.width ?? 0}x${media.metaData?.height ?? 0}`;
  return `${mediaUrl}#${encodeURIComponent([...thumbnailSrc, orgSrc].join(', '))}`;
};

export const mapMediaSourceImage = (media: SwMedia): MediaSourceImage => {
  const src = mediaToSrc(media);
  if (src === FALLBACK_IMAGE_URL) {
    return FALLBACK_IMAGE.sources[0];
  }
  return {
    provider: 'shopware',
    width: media.metaData?.width ?? 100,
    height: media.metaData?.height ?? 100,
    src,
  } satisfies MediaSourceImage;
};

export const mapMediaSourceVideo = (media: SwMedia): MediaSourceVideo =>
  ({
    provider: 'shopware',
    src: media.url as any,
    width: media.metaData?.width ?? 0,
    height: media.metaData?.height ?? 0,
  }) satisfies MediaSourceVideo;

export const mapMedia = (media: SwMedia): Media => {
  const type = media.mimeType?.startsWith('video/') ? 'video' : 'image';
  const source = type === 'image' ? mapMediaSourceImage(media) : mapMediaSourceVideo(media);

  return {
    type,
    // Shopware exposes both `alt` and `title`; prefer the explicit alt text and
    // fall back to the title, treating blank/`null` as unset. This also keeps the
    // value `string | undefined` (never `null`) — the canonical Media schema's `alt`
    // rejects `null`, so an unset-alt asset would otherwise fail validation and be
    // dropped by the media-library trust boundary (wrapProvider.sanitizeProviderItem).
    alt: media.alt || media.title || undefined,
    sources: [source] as any,
  } satisfies Media;
};
