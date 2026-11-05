/* eslint-disable import-x/export, @typescript-eslint/no-empty-object-type */
import { addPlugin, addServerHandler, createResolver, defineNuxtModule, installModule } from '@nuxt/kit';
import { defu } from 'defu';
import {
  ADOPT_SESSION_ENDPOINT_PATH,
  CHECKOUT_ENDPOINT_PATH,
  ORDER_HANDOFF_ENDPOINT_PATH,
} from './runtime/server/const/checkout';
import { registerLaioutrApp } from '@laioutr-core/kit';
import type { NuxtModule } from '@nuxt/schema';
import { name, version } from '../package.json';

/**
 * The options the module adds to the nuxt.config.ts.
 */
export interface ModuleOptions {
  endpoint: string;
  accessToken: string;
  adminEndpoint: string;
  adminClientId: string;
  adminClientSecret: string;
  /**
   * Base URL of the Shopware storefront where the LaioutrConnector plugin is installed
   * (e.g. `https://shop.example.com`). Required for `GetCheckoutUrlAction` / the cart
   * `checkoutLink`; those are unavailable when it is unset.
   */
  storefrontUrl?: string;
  /**
   * Absolute URL the storefront returns to after a login inside checkout. Defaults to the
   * request origin. Set to the project's IdP login route for external-IdP (SSO) projects.
   */
  checkoutLoginCallbackUrl?: string;
  /**
   * Absolute URL the storefront returns to after a logout inside checkout. Defaults to the
   * request origin. Set to the project's IdP RP-logout route so a storefront logout ends the
   * external session too.
   */
  checkoutLogoutCallbackUrl?: string;
  /**
   * How a shopper reaches the Shopware checkout. `embedded` frames the storefront on a Laioutr
   * checkout page; `redirect` navigates the browser to the storefront at top level, which is the
   * only way redirect-based payment providers work without a break-out.
   *
   * Must match the plugin's embedded-mode setting: nothing enforces agreement, and a mismatch
   * serves a chrome-less storefront loading a bridge with no parent frame.
   */
  checkoutMode?: 'embedded' | 'redirect';
}

/**
 * The config the module adds to nuxt.runtimeConfig.public['@laioutr/app-shopware']
 */
export interface RuntimeConfigModulePublic {
  /**
   * Origin (scheme + host) of the Shopware storefront, derived from {@link
   * ModuleOptions.storefrontUrl}. Exposed publicly so the embedded checkout section can
   * validate and pin `postMessage` traffic to the storefront frame. Empty when unset.
   */
  storefrontOrigin: string;
  /** Mirrors {@link ModuleOptions.checkoutMode}; the checkout section reads it. */
  checkoutMode: 'embedded' | 'redirect';
}

/**
 * The config the module adds to nuxt.runtimeConfig['@laioutr/app-shopware']
 */
export interface RuntimeConfigModulePrivate extends ModuleOptions {}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: name,
  },
  defaults: {
    checkoutMode: 'embedded',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const resolveRuntimeModule = (path: string) => resolve('./runtime', path);

    nuxt.options.build.transpile.push(resolve('./runtime'));

    // Runtime configuration for this module
    nuxt.options.runtimeConfig[name] = defu(nuxt.options.runtimeConfig[name] as any, options);

    // Public runtime config: expose the storefront origin (not the full URL) so the
    // embedded checkout section can validate/pin postMessage traffic to the storefront.
    nuxt.options.runtimeConfig.public[name] = defu(nuxt.options.runtimeConfig.public[name] as any, {
      storefrontOrigin: options.storefrontUrl ? new URL(options.storefrontUrl).origin : '',
      checkoutMode: options.checkoutMode ?? 'embedded',
    });

    // Make app-assets publicly available
    nuxt.options.nitro.publicAssets ??= [];
    nuxt.options.nitro.publicAssets.push({
      dir: resolveRuntimeModule('./app/public'),
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Same-origin checkout handoff route: mints a single-use session-handoff code
    // server-side and 302s to the storefront's connect-session (see server/routes/checkout.ts).
    addServerHandler({
      route: CHECKOUT_ENDPOINT_PATH,
      method: 'get',
      handler: resolveRuntimeModule('./server/routes/checkout'),
    });

    // POST endpoint the embedded checkout section calls on laioutr:auth-changed to adopt or
    // clear the storefront session server-side (see server/routes/adopt-session.post.ts).
    addServerHandler({
      route: ADOPT_SESSION_ENDPOINT_PATH,
      method: 'post',
      handler: resolveRuntimeModule('./server/routes/adopt-session.post'),
    });

    // GET counterpart for redirect checkout mode: the storefront bounces the browser here on a
    // login or logout, and this redeems the code before sending it back
    // (see server/routes/adopt-session.get.ts).
    addServerHandler({
      route: ADOPT_SESSION_ENDPOINT_PATH,
      method: 'get',
      handler: resolveRuntimeModule('./server/routes/adopt-session.get'),
    });

    // POST endpoint the embedded checkout section polls for the single-use code that lets the
    // storefront's top-level order submit install a session (see server/routes/order-handoff.post.ts).
    addServerHandler({
      route: ORDER_HANDOFF_ENDPOINT_PATH,
      method: 'post',
      handler: resolveRuntimeModule('./server/routes/order-handoff.post'),
    });

    await registerLaioutrApp({
      name,
      version,
      orchestrDirs: [resolveRuntimeModule('server/orchestr')],
      sections: [resolveRuntimeModule('app/sections/')],
      nuxtImageProviders: {
        shopware: {
          name: 'shopware',
          provider: resolveRuntimeModule('./app/image/providers/shopware'),
        },
      },
      mediaLibraryProviders: [resolveRuntimeModule('./server/media-libraries/shopware')],
    });

    // Register the app's page types (Checkout, Order Confirmation) so Studio offers them.
    addPlugin(resolveRuntimeModule('./app/plugins/pagetypes'));

    // Install peer-dependency modules only on prepare-step. Needs to be added in the playground as well.
    if (nuxt.options._prepare) {
      await installModule('@laioutr-core/frontend-core');
      await installModule('@laioutr-app/ui');
    }

    // Shared
    // Imports and other stuff which is shared between client and server

    // Client
    // Add plugins, composables, etc.

    // Server
    // Add server-only imports, etc.
  },
});

export default module;

export * from './globalExtensions';
