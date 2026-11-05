import { useRuntimeConfig } from '#imports';
import type { StorefrontClient } from '../types/shopware';
import type { ClientEnv } from '@laioutr-core/orchestr/types';
import type { H3Event } from 'h3';
import { shopwareAdminClientFactory } from '../client/shopwareAdminClientFactory';
import { shopwareClientFactory } from '../client/shopwareClientFactory';
import { isAdminConfigured, toStoreApiHeaders } from '../shopware-helper/shopwareContext';
import { getCurrentSystemEntities } from '../shopware-helper/system/getCurrentSystemEntities';
import { getCachedSystemEntities } from '../shopware-helper/system/getSystemEntities';

export interface ShopwareContext {
  /** Store API client bound to the visitor's context token, language and currency. */
  storefrontClient: StorefrontClient;
  /** Admin API client; absent when the app has no Admin API integration configured. */
  adminClient?: ReturnType<typeof shopwareAdminClientFactory>;
  /** Store API base URL, e.g. `https://shop.example.com/store-api`. */
  endpoint: string;
  /** The visitor's Shopware context token, absent until a store-API write has minted one. */
  contextToken?: string;
  /** Shopware `language.id` the request is served in, sent as `sw-language-id`. */
  languageId: string;
  /** Shopware `currency.id` the request is priced in, sent as `sw-currency-id`. */
  currencyId: string;
  /** ISO 4217 code of that currency. */
  currency: string;
  systemEntities: Awaited<ReturnType<typeof getCachedSystemEntities>>;
  currentSystemEntities: ReturnType<typeof getCurrentSystemEntities>;
  /**
   * The headers the store-API client sends right now, for calling a route the typed client does not
   * know — a plugin's own store-API route. Read it per call: a write that rotates the context token
   * updates the client.
   */
  storeApiHeaders: () => Record<string, string>;
}

/**
 * The Shopware request context this app's own handlers run in, for another app that calls the same
 * shop — a plugin's store-API route — in the visitor's session, cart and language. The token is read
 * the way this app reads it, through `shopware:context-token:resolve` and then the cookie; a write
 * that changes it is persisted with `persistContextToken`.
 */
export const getShopwareContext = async (event: H3Event, clientEnv: Pick<ClientEnv, 'locale' | 'currency'>): Promise<ShopwareContext> => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  const storefrontClient = await shopwareClientFactory(event);

  const systemEntities = await getCachedSystemEntities(storefrontClient);
  const currentSystemEntities = getCurrentSystemEntities(systemEntities, clientEnv);

  storefrontClient.defaultHeaders['sw-currency-id'] = currentSystemEntities.currency.id;
  storefrontClient.defaultHeaders['sw-language-id'] = currentSystemEntities.locale.languageId;

  return {
    storefrontClient,
    adminClient: isAdminConfigured(config) ? shopwareAdminClientFactory() : undefined,
    endpoint: config.endpoint,
    contextToken: storefrontClient.defaultHeaders['sw-context-token'] || undefined,
    languageId: currentSystemEntities.locale.languageId,
    currencyId: currentSystemEntities.currency.id,
    currency: currentSystemEntities.currency.iso,
    systemEntities,
    currentSystemEntities,
    storeApiHeaders: () => toStoreApiHeaders(storefrontClient.defaultHeaders),
  };
};
