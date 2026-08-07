import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests are colocated with source, and every suite covers a pure function —
    // the few that reach Nuxt-dependent modules stub them out.
    //
    // Deliberately plain `defineConfig` rather than `@nuxt/test-utils`' `defineVitestConfig`:
    // that helper boots a Nuxt instance, which pulls in happy-dom to build a DOM none of these
    // suites touch, and regenerates the root `.nuxt` without the playground's config — leaving
    // `vue-tsc` reporting phantom errors until the next `pnpm dev:prepare`.
    //
    // Anything needing the Nuxt environment belongs in the playground, not here.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
