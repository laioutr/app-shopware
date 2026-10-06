---
'@laioutr/app-shopware': patch
---

The Shopware media library answers a list query with `'file'` in its `type` correctly: it ignores `'file'` next to media kinds, and returns no items for `['file']` alone. Newer core-types versions allow that value; before, it turned into an invalid Shopware filter.
