import type {
  MediaFolder,
  MediaListResult,
  MediaQuery,
  MediaSortOption,
  ProviderStudioMediaItem,
} from '@laioutr-core/core-types/media-library';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { defineShopware } from '../middleware/defineShopware';
import { mapMedia } from '../shopware-helper/mediaMapper';

const SORTS: MediaSortOption[] = [
  { key: 'uploadedAt:desc', label: 'Newest first' },
  { key: 'uploadedAt:asc', label: 'Oldest first' },
  { key: 'fileName:asc', label: 'Name (A–Z)' },
  { key: 'fileName:desc', label: 'Name (Z–A)' },
  { key: 'fileSize:desc', label: 'Largest first' },
  { key: 'fileSize:asc', label: 'Smallest first' },
];

const generateSearchFilter = (search: string) => [
  { score: 500, query: { type: 'contains', field: 'media.fileName', value: search } },
  { score: 250, query: { type: 'contains', field: 'media.alt', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.title', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.tags.name', value: search } },
  { score: 500, query: { type: 'contains', field: 'media.mediaFolder.name', value: search } },
];

/** Maps our `'<field>:<dir>'` sort key to a Shopware Criteria sort array. */
export const shopwareSortCriteria = (sorting?: string) => {
  const [field, dir] = (sorting ?? 'uploadedAt:desc').split(':');
  return [{ field, order: dir === 'asc' ? 'ASC' : 'DESC' }];
};

export default defineShopware.mediaLibrary({
  capabilities: { search: true, tags: true, folders: true, sorts: SORTS },

  list: async (query: MediaQuery): Promise<MediaListResult> => {
    const api = shopwareAdminClientFactory();
    const page = query.cursor ? Number(query.cursor) : 1;

    const filters: unknown[] = [];
    if (query.folderId) {
      filters.push({ type: 'equals', field: 'mediaFolderId', value: query.folderId });
    }
    if (query.type?.length) {
      // Best-effort: mediaType.name is typed as GenericRecord in the admin API types.
      // Shopware uses 'IMAGE'/'VIDEO' as type discriminants in its internal media type system.
      filters.push({ type: 'equalsAny', field: 'mediaType.name', value: query.type.map((t) => (t === 'image' ? 'IMAGE' : 'VIDEO')) });
    }
    if (query.tags?.length) {
      filters.push({ type: 'equalsAny', field: 'tags.name', value: query.tags });
    }

    const response = await api.invoke('searchMedia post /search/media', {
      body: {
        limit: query.limit,
        page,
        'total-count-mode': 'exact' as const,
        sort: shopwareSortCriteria(query.sorting),
        ...(filters.length ? { filter: filters } : {}),
        ...(query.term ? { query: generateSearchFilter(query.term) } : {}),
      },
    });

    const items: ProviderStudioMediaItem[] =
      response.data.data?.map((media: any) => ({
        media: mapMedia(media as any),
        previewUrl: media.thumbnails?.[0]?.url ?? media.url ?? '',
      })) ?? [];

    const total = (response.data as any).total as number | undefined;
    const seen = (page - 1) * query.limit + items.length;
    return {
      items,
      total,
      nextCursor: items.length > 0 && total !== undefined && seen < total ? String(page + 1) : undefined,
    };
  },

  browseFolders: async ({ parentId }): Promise<{ folders: MediaFolder[] }> => {
    const api = shopwareAdminClientFactory();
    const response = await api.invoke('searchMediaFolder post /search/media-folder', {
      body: {
        limit: 500,
        filter: [{ type: 'equals', field: 'parentId', value: parentId ?? null }],
        sort: [{ field: 'name', order: 'ASC' }],
      },
    });
    const folders: MediaFolder[] =
      (response.data as any).data?.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId ?? undefined,
        childCount: folder.childCount ?? undefined,
      })) ?? [];
    return { folders };
  },
});
