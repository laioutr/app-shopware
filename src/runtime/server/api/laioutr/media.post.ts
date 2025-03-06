import { defineEventHandler, readValidatedBody } from '#imports';
import { ProviderStudioMediaArgs, ProviderStudioMediaItem } from '@laioutr-core/canonical-types/studio';
import { shopwareAdminClientFactory } from '../../client/shopwareAdminClientFactory';
import { mapMedia } from '../../shopware-helper/mediaMapper';

export default defineEventHandler(async (event) => {
  const api = shopwareAdminClientFactory();
  const args = await readValidatedBody(event, ProviderStudioMediaArgs.parse);

  const response = await api.invoke('searchMedia post /search/media', {
    body: {
      limit: args.limit,
      page: Math.floor(args.offset / args.limit) + 1,
      'total-count-mode': 'exact' as const,
    },
  });

  const laioutrProviderMedia: ProviderStudioMediaItem[] =
    response.data.data?.map((media) => ({
      media: mapMedia(media as any),
      previewUrl: media.thumbnails?.[0]?.url ?? media.url ?? '',
    })) ?? [];

  return {
    items: laioutrProviderMedia,
    total: (response.data as any).total,
  };
});
