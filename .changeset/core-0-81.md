---
'@laioutr/app-shopware': minor
---

**Breaking:** the app requires `@laioutr-core/orchestr`, `frontend-core`, `core-types` and `kit` 0.81.0 or later, and `@laioutr-core/canonical-types` 0.42.0 or later. A project that also runs `@laioutr-app/ui` needs 2.37.1 or later, which brings the same `canonical-types`.

```jsonc
// before
"@laioutr-core/canonical-types": ">=0.40.0",
"@laioutr-core/orchestr": ">=0.79.0"
// after
"@laioutr-core/canonical-types": ">=0.42.0",
"@laioutr-core/orchestr": ">=0.81.0"
```
