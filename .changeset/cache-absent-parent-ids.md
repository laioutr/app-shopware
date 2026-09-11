---
'@laioutr/app-shopware': patch
---

A product detail page for a top-level product no longer asks Shopware for a parent id on every
request. The app looks up a variant's parent to resolve the product behind a slug, and a product that
has no parent — most of a catalogue — produced an answer the cache had no way to hold, so the lookup
repeated on every hit that did not arrive by way of a listing.

The cache now records "this product has no parent" as a first-class answer, kept for the same seven
days as a parent id, and both the single-product lookup and the bulk write behind listing and search
results store it the same way. A lookup that fails against Shopware still caches nothing, so an
outage cannot pin a wrong answer.

Entries written by earlier versions stay correct while they age out.
