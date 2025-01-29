import { fileURLToPath } from 'node:url';
import srcModule from '../src/module';

export default defineNuxtConfig({
  modules: [
    // @ts-expect-error ModuleOptions type doesn't match
    srcModule,
    '@laioutr-core/orchestr',
  ],
  alias: {
    '@laioutr-app/shopware': fileURLToPath(new URL('../src', import.meta.url)),
  },
  devtools: { enabled: true },
  telemetry: false,
  compatibilityDate: '2024-11-11',
});
