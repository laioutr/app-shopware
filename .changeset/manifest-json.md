---
'@laioutr/app-shopware': patch
---

`laioutr.manifest.json` is valid JSON again. In 0.23.0 an unescaped quote in the Admin API description broke it, so 0.23.0 never reached the Laioutr Cockpit and its settings form could not be read. Use 0.23.1 instead.
