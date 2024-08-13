import { defineLaioutrPlugin } from '@laioutr/frontend/kit/defineLaioutrPlugin';

interface NuxtOptionsWithImage {
  image?: {
    domains?: string[];
  };
}

export default defineLaioutrPlugin({
  meta: {
    name: '@laioutr/shopware',
  },
  defaults: {
    accessToken: '',
    endpoint: '',
    imageDomains: [] as string[],
  },
  setup(options, nuxt) {
    const imgOptions = nuxt.options as NuxtOptionsWithImage;
    const imageDomains = [new URL(options.endpoint).hostname, ...(options.imageDomains ?? [])];
    imgOptions.image ??= {};
    imgOptions.image.domains ??= [];
    imgOptions.image.domains.push(...imageDomains);

    console.log('@laioutr/shopware::setup()');
  },
});
