---
'@laioutr/app-shopware': minor
---

Submit the embedded checkout's order from the top-level window, so redirect-based payment
providers work — and return the shopper to Laioutr afterwards.

PayPal, Klarna and other providers that redirect out of checkout refuse to render inside an
iframe, and once framed they cannot navigate back out — the shopper reached a dead end with the
order already created. The confirm form now submits into the top-level window instead, and both
outcomes come back: a completed order lands on the configured Order Confirmation Page, and a
failed or cancelled payment returns to the checkout page with the retry rendered in the frame.

The section gains a **Checkout Page** link, which it uses to bring shoppers back for a retry.
Requires a `LaioutrConnector` build that exposes `POST /laioutr/checkout-order` and the return
trip.
