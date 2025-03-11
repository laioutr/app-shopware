import { Media, MediaSourceImage, MediaSourceVideo } from '@laioutr-core/canonical-types';
import { Schemas } from '../types/storeApiTypes';

type SwMedia = Schemas['Media'];

// Source and thumbnails are encoded in a valid url like this:
// /original-source.jpg#/thumbnail-1.jpg 100x100, /thumbnail-2.jpg 200x200
export const mediaToSrc = (media: SwMedia) => {
  const thumbnails = media.thumbnails ?? [];
  const thumbnailSrc = thumbnails.map((thumb) => `${thumb.url} ${thumb.width}x${thumb.height}`);
  const orgSrc = `${media.url} ${media.metaData?.width ?? 0}x${media.metaData?.height ?? 0}`;
  return `${media.url}#${encodeURIComponent([...thumbnailSrc, orgSrc].join(', '))}`;
};

export const mapMediaSourceImage = (media: SwMedia): MediaSourceImage =>
  ({
    provider: 'shopware',
    width: media.metaData?.width ?? 0,
    height: media.metaData?.height ?? 0,
    src: mediaToSrc(media),
  }) satisfies MediaSourceImage;

export const mapMediaSourceVideo = (media: SwMedia): MediaSourceVideo =>
  ({
    provider: 'shopware',
    src: media.url as any,
    width: media.metaData?.width ?? 0,
    height: media.metaData?.height ?? 0,
  }) satisfies MediaSourceVideo;

export const mapMedia = (media: SwMedia): Media => {
  const type = media.mimeType?.startsWith('image/') ? 'image' : 'video';
  const source = type === 'image' ? mapMediaSourceImage(media) : mapMediaSourceVideo(media);

  return {
    type,
    alt: media.alt,
    sources: [source],
  } satisfies Media;
};
