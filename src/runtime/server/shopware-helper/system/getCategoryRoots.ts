import { createAPIClient } from '@shopware/api-client';
import { consola } from 'consola';
import { useRuntimeConfig, useUserlandCache } from '#imports';
import type { operations } from '../../types/storeApiTypes';

const logger = consola.withTag('shopware/category-roots');

const ROOTS_TTL = 60 * 60 * 24; // 1 day
const entryOptions = { maxAge: ROOTS_TTL };

/** The roots of the sales channel's category trees, by the menu each one serves. */
export interface CategoryRoots {
  navigation: string;
  service?: string;
  footer?: string;
}

/**
 * The sales channel's category roots, cached for a day per shop. Read without the visitor's context
 * token: the roots belong to the sales channel, and a token-less `/context` read answers with a fresh
 * token the visitor's client would adopt. A failed read answers `undefined` and is retried next call.
 */
export const getCachedCategoryRoots = async (): Promise<CategoryRoots | undefined> => {
  const { endpoint, accessToken } = useRuntimeConfig()['@laioutr/app-shopware'];
  const cache = useUserlandCache<CategoryRoots>(`shopware:${accessToken}:category-roots`);
  const cached = await cache.readOne('default', entryOptions);
  if (cached && !cached.absent) return cached.value;

  try {
    const client = createAPIClient<operations>({ baseURL: endpoint, accessToken });
    const { salesChannel } = (await client.invoke('readContext get /context')).data;
    const roots: CategoryRoots = {
      navigation: salesChannel.navigationCategoryId,
      // Shopware sends `null` for an unset root despite the type.
      service: salesChannel.serviceCategoryId || undefined,
      footer: salesChannel.footerCategoryId || undefined,
    };
    cache.writeOne('default', roots, entryOptions);
    return roots;
  } catch (err) {
    logger.warn('Could not read the sales channel category roots; category breadcrumbs show the whole path', err);
    return undefined;
  }
};
