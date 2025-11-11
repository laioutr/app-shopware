import srcModule from '../src/module';

export default defineNuxtConfig({
  modules: [
    srcModule,
    '@pinia/nuxt', // Added to show in devtools
    '@laioutr-core/frontend-core',
    '@laioutr-core/orchestr',
    '@laioutr-core/orchestr-devtools',
  ],
  devtools: { enabled: true },
  telemetry: false,
  compatibilityDate: '2025-11-11',
  '@laioutr/app-shopware': {
    endpoint: import.meta.env.SHOPWARE_DEMO_ENDPOINT,
    accessToken: import.meta.env.SHOPWARE_DEMO_ACCESS_TOKEN,
    adminEndpoint: import.meta.env.SHOPWARE_DEMO_ADMIN_ENDPOINT,
    adminClientId: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_ID,
    adminClientSecret: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_SECRET,
  },
  vite: {
    optimizeDeps: {
      include: ['ajv', 'json-source-map', 'natural-compare-lite'],
    },
  },
});
