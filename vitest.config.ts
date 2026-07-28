import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  // any custom Vitest config you require
  test: {
    // @nuxt/test-utils' nuxt-environment project collects only `*.nuxt.{test,spec}.ts` unless
    // `include` is set, silently skipping plain pure-function tests.
    include: ['src/**/*.test.ts'],
    environmentOptions: {
      nuxt: {
        rootDir: './playground',
      },
    },
  },
});
