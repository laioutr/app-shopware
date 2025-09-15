import { createPassthroughToken } from '#imports';

export const currentProductIdsToken = createPassthroughToken<string[]>('@laioutr-app/shopify/productsFragment');
