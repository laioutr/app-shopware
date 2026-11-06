---
'@laioutr/app-shopware': minor
---

Another app can call the same Shopware instance in the visitor's session through the new `@laioutr/app-shopware/server` entry. `getShopwareContext(event, clientEnv)` hands back the store-API client, the Admin API client when one is configured, the store-API endpoint, the visitor's context token, the resolved language and currency ids, and the headers for a plugin route the typed client does not know. `persistContextToken` and `clearContextToken` store or drop a token a write returned, with the same `shopware:context-token:changed` notification this app fires.

```ts
import { getShopwareContext } from '@laioutr/app-shopware/server';

const shopware = await getShopwareContext(event, clientEnv);
await $fetch(`${shopware.endpoint}/my-plugin/route`, { method: 'POST', headers: shopware.storeApiHeaders() });
```
