---
'@laioutr/app-shopware': minor
---

Products carry their manufacturer as `ProductBrand`, with its name and website, and `ProductInfo.brandLink` links to the same site. A product without variants used to show no brand at all, because its manufacturer was never read; it now shows it like any other product. A website entered without a scheme (`www.example.com`) is taken as https, and anything that is not an http(s) URL is left out.
