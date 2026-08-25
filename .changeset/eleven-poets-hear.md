---
'@laioutr/app-shopware': patch
---

Stop offering variants a shop cannot sell. Variants were read through the `children` association,
which returns every child a product has regardless of whether this sales channel carries it, so a
product page could show colours and sizes that were switched off — picking one and adding it to the
cart failed with a product-not-found. They now come from a `/product` read filtered by parent, which
applies Shopware's own visibility rules, and unsellable variants no longer appear at all.
