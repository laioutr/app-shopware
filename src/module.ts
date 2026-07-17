/* eslint-disable import-x/export, @typescript-eslint/no-empty-object-type */
import { addPlugin, addServerHandler, createResolver, defineNuxtModule, installModule } from '@nuxt/kit';
import { defu } from 'defu';
import { CHECKOUT_ENDPOINT_PATH } from './runtime/server/const/checkout';
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
}

/**
 * The config the module adds to nuxt.runtimeConfig.public['@laioutr-app/shopware']
 */
export interface RuntimeConfigModulePublic {
  /**
   * Origin (scheme + host) of the Shopware storefront, derived from {@link
   * ModuleOptions.storefrontUrl}. Exposed publicly so the embedded checkout section can
   * validate and pin `postMessage` traffic to the storefront frame. Empty when unset.
   */
  storefrontOrigin: string;
}

/**
 * The config the module adds to nuxt.runtimeConfig['@laioutr-app/shopware']
 */
export interface RuntimeConfigModulePrivate extends ModuleOptions {}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: name,
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
