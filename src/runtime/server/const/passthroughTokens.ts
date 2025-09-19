import { createPassthroughToken } from '#imports';
import { ShopwareCategory } from '../types/shopware';

export const currentProductIdsToken = createPassthroughToken<string[]>('@laioutr-app/shopware/productsFragment');

export const categoriesToken = createPassthroughToken<ShopwareCategory[]>('@laioutr-app/shopware/categories');
