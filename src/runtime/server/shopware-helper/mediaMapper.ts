import { Media, MediaSourceImage, MediaSourceVideo } from '@laioutr-core/canonical-types';
import { Schemas } from '../types/storeApiTypes';

type SwMedia = Schemas['Media'];
type SwMediaThumbnail = Schemas['MediaThumbnail'];

export const mediaToSrc = (media: SwMedia) => {
  const thumbnails = media.thumbnails ?? [];
  const thumbnailSrc = thumbnails.map((thumb) => `${thumb.url} ${thumb.width}x${thumb.height}`);
  const orgSrc = `${media.url} ${media.metaData?.width ?? 0}x${media.metaData?.height ?? 0}`;
  return [...thumbnailSrc, orgSrc].join(', ');
};

export const mapMediaSourceImage = (media: SwMedia): MediaSourceImage =>
  ({
    provider: 'shopware',
    width: media.metaData?.width ?? 0,
    height: media.metaData?.height ?? 0,
    src: mediaToSrc(media),
    orgSrc: media.url as any,
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
