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

/** Scopes a browse to one folder level: a folder's id, or `null` for unfiled root assets (design §4.4). */
export const shopwareFolderFilter = (folderId: string | undefined) => ({
  type: 'equals' as const,
  field: 'mediaFolderId',
  value: folderId ?? null,
});

/** Shopware `mediaType.name` discriminants for our media types. */
const SHOPWARE_MEDIA_TYPE: Record<string, string> = { image: 'IMAGE', video: 'VIDEO', audio: 'AUDIO' };

/**
 * Compiles a `MediaQuery` into Shopware Criteria filters. `scope: 'all'` searches
 * the whole library — no folder filter — because `folderId: undefined` means the
 * root level, which in Shopware holds only unfiled assets (design §4.4).
 */
export const buildShopwareMediaFilters = (query: MediaQuery): unknown[] => {
  const filters: unknown[] = [];
  if (query.scope !== 'all') {
    filters.push(shopwareFolderFilter(query.folderId));
  }
  if (query.type?.length) {
    // Best-effort: mediaType.name is typed as GenericRecord in the admin API types.
    filters.push({ type: 'equalsAny', field: 'mediaType.name', value: query.type.map((t) => SHOPWARE_MEDIA_TYPE[t]) });
  }
  if (query.tags?.length) {
    filters.push({ type: 'equalsAny', field: 'tags.name', value: query.tags });
  }
  return filters;
};

const fetchChildFolders = async (
  api: ReturnType<typeof shopwareAdminClientFactory>,
  parentId: string | undefined
): Promise<MediaFolder[]> => {
  const response = await api.invoke('searchMediaFolder post /search/media-folder', {
    body: {
      limit: 500,
      filter: [{ type: 'equals', field: 'parentId', value: parentId ?? null }],
      sort: [{ field: 'name', order: 'ASC' }],
    },
  });
  return (
    (response.data as any).data?.map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId ?? undefined,
      childCount: folder.childCount ?? undefined,
    })) ?? []
  );
};

export default defineShopware.mediaLibrary({
  capabilities: { search: true, tags: true, folders: true, sorts: SORTS },

  list: async (query: MediaQuery, ctx): Promise<MediaListResult> => {
    // The per-request context (design §4.6) already carries the admin client the initware built.
    const api = ctx.adminClient;
    const page = query.cursor ? Number(query.cursor) : 1;

    const filters = buildShopwareMediaFilters(query);

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

    // Folders ride in the list response on the FIRST (cursorless) page only (design §4.4);
    // a whole-library search (`scope: 'all'`) has no folder level, so no tiles either.
    const folders = query.cursor || query.scope === 'all' ? undefined : await fetchChildFolders(api, query.folderId);

    const items: ProviderStudioMediaItem[] =
      response.data.data?.map((media: any) => ({
        media: mapMedia(media as any),
        previewUrl: media.thumbnails?.[0]?.url ?? media.url ?? '',
        externalId: media.id,
      })) ?? [];

    const total = (response.data as any).total as number | undefined;
    const seen = (page - 1) * query.limit + items.length;
    return {
      items,
      ...(folders ? { folders } : {}),
      total,
      nextCursor: items.length > 0 && total !== undefined && seen < total ? String(page + 1) : undefined,
    };
  },
});
