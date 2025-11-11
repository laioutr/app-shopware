import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  // Other unbuild configuration...
  externals: [
    // Add other external dependencies if you have them...
    'defu',
    '@parcel/watcher',
    '@laioutr-core/frontend-core',
    '@laioutr-core/kit',
  ],
});
