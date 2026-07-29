import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  // `h3` is provided by the host app at runtime (via Nitro) and reaches us only
  // transitively through the `nuxt` devDependency, so module-builder's default
  // externals list does not cover it. The `nitropack` hook declarations in
  // `globalExtensions.ts` reference `H3Event`, so the type bundler inlines h3 —
  // and with it ufo, crossws, cookie-es and iron-webcrypto — unless told not to.
  externals: ['h3'],
});
