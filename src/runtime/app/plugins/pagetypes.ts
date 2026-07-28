import { defineNuxtPlugin } from '#app';
import { pageTypeTokenRegistry } from '@laioutr-core/core-types/frontend';
import { Checkout } from '../../shared/pageTypes/checkout.pagetype';

/**
 * Registers the app's page types so Studio offers them when an editor creates a page.
 * `getMetadata` forces the token modules to load (registration is their import side
 * effect); the reflect cache reads `pageTypeTokenRegistry.all()`.
 */
export default defineNuxtPlugin(() => {
  [Checkout].forEach((token) => pageTypeTokenRegistry.getMetadata(token));
});
