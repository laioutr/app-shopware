---
'@laioutr/app-shopware': minor
---

`GetOwnReviewAction` and `UpdateOwnReviewAction`: a logged-in customer reads their own review of a product, with whether the shop approved it, and changes its title, text and rating. The change keeps the reviewer name and email, and Shopware holds it back until it is approved again. Both need the Admin API integration with the role permission "Reviews: Read"; without the integration the storefront does not offer them. Requires `@laioutr-core/canonical-types` 0.45.0 and `@laioutr-core/frontend-core`, `orchestr`, `core-types` and `kit` 0.84.0.
