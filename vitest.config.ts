import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  // any custom Vitest config you require
  test: {
    // Without an explicit include, @nuxt/test-utils' nuxt-environment project only picks up
    // `*.nuxt.{test,spec}.ts` files, so plain pure-function tests (no `#imports`) are never
    // discovered. Same fix as packages/orchestr/vitest.config.ts.
    include: ['src/**/*.test.ts'],
    environmentOptions: {
      nuxt: {
        rootDir: './playground',
      },
    },
  },
});
