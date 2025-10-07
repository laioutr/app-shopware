import { Media, MediaSourceImage, MediaSourceVideo } from '@laioutr-core/canonical-types';
import { FALLBACK_IMAGE, FALLBACK_IMAGE_URL } from '../const/fallbacks';
import { Schemas } from '../types/storeApiTypes';

type SwMedia = Schemas['Media'];

// Source and thumbnails are encoded in a valid url like this:
// /original-source.jpg#/thumbnail-1.jpg 100x100, /thumbnail-2.jpg 200x200
export const mediaToSrc = (media: SwMedia) => {
  // TODO: remove me after möbel rogg demo
  const anyCustomFields = (media.customFields ?? {}) as any;
  const cdnMediaUrl = 'adobe_media_url' in anyCustomFields ? (anyCustomFields.adobe_media_url as string | undefined) : media.url;
  if (cdnMediaUrl) {
    return cdnMediaUrl;
  }

  if ((!media.thumbnails || media.thumbnails.length === 0) && !media.url) {
    return FALLBACK_IMAGE_URL;
  }

  const thumbnails = media.thumbnails ?? [];
  const thumbnailSrc = thumbnails.map((thumb) => `${thumb.url} ${thumb.width}x${thumb.height}`);
  const orgSrc = `${media.url} ${media.metaData?.width ?? 0}x${media.metaData?.height ?? 0}`;
  return `${media.url}#${encodeURIComponent([...thumbnailSrc, orgSrc].join(', '))}`;
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
    alt: media.alt,
    sources: [source] as any,
  } satisfies Media;
};
