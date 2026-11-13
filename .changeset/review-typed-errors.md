---
'@laioutr/app-shopware': minor
---

`CreateReviewAction` throws the canonical error for each refusal Shopware reports, and `InvalidFieldError` from every Shopware form carries the `limit` Shopware names, such as the minimum length of a text that is too short.

**Breaking:** `CreateReviewAction` no longer resolves a refused review as `success: false`. It throws `UnauthenticatedError` for an expired session, `ReviewsDisabledError` when the sales channel has reviews switched off, `ReviewAlreadyExistsError` for a second review by the same customer, and `InvalidFieldError` naming the field for any other violation. Any other failure fails the call.

```ts
// before
const { success } = await fetchAction(CreateReviewAction, review);
if (!success) showReviewFailed();

// after
try {
  await fetchAction(CreateReviewAction, review);
} catch (error) {
  if (actionErrorOf(error, ReviewAlreadyExistsError)) showAlreadyReviewed();
  else throw error;
}
```
