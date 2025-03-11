import { defineMediaLibraryProvider } from '#imports';
import { ProviderStudioMediaItem } from '@laioutr-core/canonical-types/studio';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { mapMedia } from '../shopware-helper/mediaMapper';

const generateSearchFilter = (search: string) => [
  { score: 500, query: { type: 'contains', field: 'media.fileName', value: search } },
  { score: 250, query: { type: 'contains', field: 'media.alt', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.title', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.tags.name', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.mediaFolder.name', value: search } },
];

export default defineMediaLibraryProvider({
  name: 'shopware',
  label: 'Shopware',
  invoke: async (args) => {
    const api = shopwareAdminClientFactory();
    const response = await api.invoke('searchMedia post /search/media', {
      body: {
        limit: args.limit,
        page: Math.floor(args.offset / args.limit) + 1,
        'total-count-mode': 'exact' as const,
        ...(args.search ? { query: generateSearchFilter(args.search) } : {}),
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
      offset: args.offset,
      limit: args.limit,
    };
  },
});
