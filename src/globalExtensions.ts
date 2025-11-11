/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { RuntimeConfigModulePrivate, RuntimeConfigModulePublic } from './module';

declare module 'vue' {
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    // Add your module's custom properties here
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    ['my-laioutr-app']: RuntimeConfigModulePublic;
  }
  interface RuntimeConfig {
    ['my-laioutr-app']: RuntimeConfigModulePrivate;
  }
}

export {};
