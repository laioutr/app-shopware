/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { RuntimeConfigModulePrivate, RuntimeConfigModulePublic } from './module';
import type { ShopwareCriteria, ShopwareCriteriaTarget } from './runtime/server/types/criteria';
import type { ShopwareSettings } from './runtime/server/types/settings';
import type { HookResult } from '@nuxt/schema';
import type { H3Event } from 'h3';

declare module 'vue' {
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    // Add your module's custom properties here
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    ['@laioutr/app-shopware']: RuntimeConfigModulePublic;
  }
  interface RuntimeConfig {
    ['@laioutr/app-shopware']: RuntimeConfigModulePrivate;
  }
}

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    /**
     * Fetch (bail): a host handler may set `result.token` to supply the Shopware context token
     * from its own session store; the cookie is the fallback. Read-only; must NOT mint a token.
     */
    'shopware:context-token:resolve': (args: { event: H3Event; result: { token?: string } }) => HookResult;
    /**
     * Notification: fired after the context token is (re)persisted (`token` is the new value) or
     * cleared on a storefront logout (`token` is `null`), so a host can mirror the change into its
     * own store (e.g. keyed by the external IdP subject) — persisting on a value, clearing on null.
     */
    'shopware:context-token:changed': (args: { event: H3Event; token: string | null }) => HookResult;
    'shopware:criteria:resolve': (args: {
      event: H3Event;
      target: ShopwareCriteriaTarget;
      result: { criteria: ShopwareCriteria };
    }) => HookResult;
    'shopware:settings:resolve': (args: { event: H3Event; result: { settings: ShopwareSettings } }) => HookResult;
  }
}

export {};
