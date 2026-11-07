---
'@laioutr/app-shopware': minor
---

Another app can call the same Shopware instance in the visitor's session through the new `@laioutr/app-shopware/runtime` entry. `defineShopware` is the Orchestr builder this app's own handlers use, typed for the importing app: its `context` carries the store-API client, the Admin API client, the store-API `endpoint`, the visitor's context token, the resolved language and currency, and `storeApiHeaders()` for a plugin route the typed client does not know. `getShopwareContext(event, clientEnv)` returns the same context outside an Orchestr handler. `persistContextToken` and `clearContextToken` store or drop a token a write returned, with the same `shopware:context-token:changed` notification this app fires.

```ts
import { defineShopware } from '@laioutr/app-shopware/runtime';

export default defineShopware.componentResolver({
  label: 'Live stock',
  entityType: 'ProductVariant',
  provides: [LiveStock],
  resolve: async ({ entityIds, context }) => {
    const stock = await $fetch(`${context.endpoint}/my-plugin/live-stock`, {
      method: 'POST',
      headers: context.storeApiHeaders(),
      body: { ids: entityIds },
    });
    // …
  },
});
```
