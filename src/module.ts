/* eslint-disable import-x/export, @typescript-eslint/no-empty-object-type */
import { addServerHandler, createResolver, defineNuxtModule, installModule } from '@nuxt/kit';
import { defu } from 'defu';
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
}

/**
 * The config the module adds to nuxt.runtimeConfig.public['@laioutr-app/shopware']
 */
export interface RuntimeConfigModulePublic {}

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
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const resolveRuntimeModule = (path: string) => resolve('./runtime', path);

    nuxt.options.build.transpile.push(resolve('./runtime'));

    // Runtime configuration for this module
    nuxt.options.runtimeConfig[name] = defu(nuxt.options.runtimeConfig[name] as any, options);

    registerLaioutrApp({
      name,
      orchestrDirs: [resolveRuntimeModule('server/orchestr')],
    });

    // Install peer-dependency modules only on prepare-step. Needs to be added in the playground as well.
    if (nuxt.options._prepare) {
      installModule('@laioutr-core/orchestr');
    }

    // Shared
    // Imports and other stuff which is shared between client and server

    // Client
    // Add plugins, composables, etc.

    // Server
    // Add server-only imports, etc.
    // TODO move to frontend-core, only provide library adapter here
    addServerHandler({
      route: '/api/laioutr/media',
      handler: resolveRuntimeModule('server/api/laioutr/media.post.ts'),
    });
  },
});

export default module;

export * from './globalExtensions';
