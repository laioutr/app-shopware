import { Media } from '@laioutr-core/canonical-types';
import { Schemas } from '../types/storeApiTypes';

type SwMedia = Schemas['Media'];
type SwMediaThumbnail = Schemas['MediaThumbnail'];

export const mapMediaThumbnail = (thumbnail: SwMediaThumbnail) => ({
  width: thumbnail.width ?? 0,
  height: thumbnail.height ?? 0,
  src: thumbnail.url,
});

export const mapMedia = (media: SwMedia): Media =>
  ({
    type: media.mimeType?.startsWith('image/') ? 'image' : 'video',
    alt: media.alt,
    sources: [
      {
        provider: 'shopware',
        width: media.metaData?.width ?? 0,
        height: media.metaData?.height ?? 0,
        src: (media.thumbnails?.map(mapMediaThumbnail) ?? []) as any,
      },
    ],
  }) satisfies Media;
