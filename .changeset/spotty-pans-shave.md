---
'@laioutr/app-shopware': patch
---

Percent-encode spaces in media URLs so images whose Shopware filename contains a space render
instead of 404ing. Shopware serves such filenames unencoded, and the space-delimited composite src
the app builds made the image provider truncate the URL at the first space.
