import { defineLaioutrPlugin } from '@laioutr/kit';
import { setup, getProducts } from '@shopware-pwa/shopware-6-client';

interface PluginOptions {
  endpoint: string;
  accessToken: string;
}

export default defineLaioutrPlugin({
  meta: {
    name: '@laioutr/shopware/entity',
  },
  setup(options: PluginOptions) {
    setup(options);
  },
  resolvers: {
    product: {
      availableComponents: ['base'],
      resolver: async (ids: string[], requestedComponents: string[]) => {
        const swProducts = await getProducts({ ids });
        return Object.fromEntries(swProducts.elements.map((product) => [product.id, product]));
      },
    },
  },
});
