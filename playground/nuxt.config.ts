import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defu } from 'defu';
import type { ModuleOptions } from '../src/module';
import type { RcProject } from '@laioutr-core/core-types/rc';
import srcModule from '../src/module';

const laioutrrcPath = fileURLToPath(new URL('../laioutrrc.json', import.meta.url));

// A laioutrrc.json exported from Cockpit turns the playground into that project — its pages,
// markets and apps. It is gitignored, so the playground has to boot without one too; frontend-core
// then registers no project routes.
const laioutrrc: RcProject | undefined = existsSync(laioutrrcPath)
  ? (JSON.parse(readFileSync(laioutrrcPath, 'utf8')) as RcProject)
  : undefined;

// This app is registered from ../src, so frontend-core finds it already installed when it walks
// `laioutrrc.apps` and its merge of the app config lands after setup has read the options. Seed them
// here instead, with the environment winning so a .env can point the playground at another shop.
const laioutrrcShopware = laioutrrc?.apps.find((app) => app.name === '@laioutr/app-shopware')
  ?.config as Partial<ModuleOptions> | undefined;

export default defineNuxtConfig({
  modules: [
    srcModule,
    '@pinia/nuxt', // Added to show in devtools
    '@laioutr-core/frontend-core',
    '@laioutr-core/orchestr',
    '@laioutr-core/devtools',
  ],
  alias: {
    '@laioutr/app-shopware': fileURLToPath(new URL('../src', import.meta.url)),
  },
  devtools: { enabled: true },
  telemetry: false,
  compatibilityDate: '2024-11-11',
  hooks: {
    // The rc brings its own home page, so hand `/` over to it and keep the playground's own page —
    // the only one there is without an rc — reachable under an underscore-prefixed path.
    'pages:extend'(pages) {
      if (!laioutrrc) return;
      const index = pages.find((page) => page.path === '/');
      if (index) index.path = '/_playground';
    },
  },
  laioutr: { laioutrrc },
  '@laioutr/app-shopware': defu(
    {
      endpoint: import.meta.env.SHOPWARE_DEMO_ENDPOINT,
      accessToken: import.meta.env.SHOPWARE_DEMO_ACCESS_TOKEN,
      adminEndpoint: import.meta.env.SHOPWARE_DEMO_ADMIN_ENDPOINT,
      adminClientId: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_ID,
      adminClientSecret: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_SECRET,
      checkoutMode: 'redirect' as const,
    },
    laioutrrcShopware,
  ),
});
