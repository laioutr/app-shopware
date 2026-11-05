---
'@laioutr/app-shopware': minor
---

The newsletter handler can be switched off with `newsletter: { enabled: false }`, so another app that implements `SubscribeAction` (an ESP integration such as Klaviyo) owns newsletter sign-up. Without the switch, the app that registers last wins, so the outcome depends on install order.

When the handler stays on, it forwards the input's `customFields`. Shopware 6.6+ stores the ones the shop lets the Store API write to a newsletter recipient. The `option` it sends is configurable with `newsletter.option` (`'subscribe'`, the default, or `'direct'`). Shopware core treats both the same and takes double opt-in from the sales channel's `core.newsletter.doubleOptIn` setting; only plugins that decorate the subscribe route read the option.
