# Redirect checkout mode — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project send shoppers to the Shopware storefront checkout by top-level redirect
instead of framing it, syncing the storefront session back to Laioutr the moment it changes.

**Architecture:** One new module option (`checkoutMode`) branches the cart's checkout link and
the callback targets a handoff mint installs. On the Shopware side, `CallbackRedirector` gains
the code mint that `AuthBridgeNotifier` already performs, plus a `return-to` carrying Shopware's
own redirect destination, so the auth bounce is a round trip that leaves the shopper where they
were. A new GET handler on the app's adopt-session path redeems the code and sends them back.

**Tech Stack:** PHP 8.2 / Symfony / Shopware 6.7 / PHPUnit / PHPStan on the connector side;
Nuxt module, Nitro server routes, Vitest on the app side.

**Spec:** `docs/plans/2026-08-25-redirect-checkout-mode-design.md`

**Execution note for this run:** the user asked for inline execution with a single final
verification, commit and PR. Run each task's tests as written; skip per-task commits.

## Global Constraints

- Money is `{ amount, currency }`, `amount` in minor units, `currency` an ISO 4217 code. Not
  touched by this work, listed because it is project-wide.
- Never cite a design doc, plan, spec or review from code, comments, test names or error
  messages. State the reason inline in a clause instead.
- Comments explain **why**, present tense, one line where one line does. No JSDoc restating a
  signature. Do not comment code that isn't there.
- No Vue component tests — no mounting, no Vue Test Utils, no component snapshots.
- Every app-owned URL stays namespaced under `/app-shopware/`.
- Conventional commits, Angular style.
- Connector: `vendor/bin/phpunit` and `vendor/bin/phpstan analyse` must both be clean.
- App: run `pnpm dev:prepare` before lint or typecheck, or every import reports unresolved.
- ESLint bans `console.error` (use `console.warn`), enforces `sort-imports` and `no-void`.

---

## File Structure

**Connector — `/Users/sl/src/shopware-laioutr-integration`**

| File | Responsibility |
| --- | --- |
| `src/Session/Integration/CallbackRedirector.php` | Modify: mint a code, carry `return-to` |
| `src/Session/Subscriber/AuthSubscriber.php` | Modify: pass token/channel, `carryReturn = true` |
| `src/Session/Subscriber/RouteSubscriber.php` | Modify: pass token/channel, `carryReturn = false` |
| `tests/Unit/Session/Integration/CallbackRedirectorTest.php` | Modify: new signatures, new cases |
| `tests/Unit/Session/Subscriber/AuthSubscriberTest.php` | Modify: assert the new call shape |
| `tests/Unit/Session/Subscriber/RouteSubscriberTest.php` | Modify: assert the new call shape |
| `README.md` | Modify: redirect mode, the bounce, the params |

`services.yaml` needs no change — `_defaults: autowire: true` resolves the two new constructor
arguments, both already registered.

**App — `/Users/sl/src/app-shopware`**

| File | Responsibility |
| --- | --- |
| `src/module.ts` | Modify: `checkoutMode` option, public config, GET handler |
| `src/runtime/server/shopware-helper/checkoutLink.ts` | Create: pure link decision |
| `src/runtime/server/shopware-helper/checkoutLink.test.ts` | Create |
| `src/runtime/server/shopware-helper/resolveReturnTo.ts` | Create: pure origin validation |
| `src/runtime/server/shopware-helper/resolveReturnTo.test.ts` | Create |
| `src/runtime/server/shopware-helper/resolveCheckout.ts` | Modify: callback targets per mode |
| `src/runtime/server/shopware-helper/resolveCheckout.test.ts` | Modify |
| `src/runtime/server/orchestr/cart/base.resolver.ts` | Modify: use the link helper |
| `src/runtime/server/routes/adopt-session.get.ts` | Create: redeem and bounce back |
| `src/runtime/app/sections/SectionShopwareCheckout.vue` | Modify: dev warning |
| `README.md`, `.changeset/*.md` | Modify / create |

The two new helpers are pure and live beside the existing `resolveCheckout` / `resolveAdoptSession`
pair, which is where this repo keeps testable decision logic.

---

## Task 1: `CallbackRedirector` mints a code and carries `return-to`

**Files:**
- Modify: `src/Session/Integration/CallbackRedirector.php`
- Test: `tests/Unit/Session/Integration/CallbackRedirectorTest.php`

**Interfaces:**
- Consumes: `SessionHandoffCodeService::generateCode()`, `SessionHandoffStore::issue($code, $contextToken, $salesChannelId, $loginCb, $logoutCb, $redirectRoute)` — both already used the same way by `AuthBridgeNotifier`.
- Produces:
  ```php
  scheduleLoginCallback(Request $request, string $contextToken, string $salesChannelId, string $from, bool $carryReturn): void
  scheduleLogoutCallback(Request $request, string $from, bool $carryReturn): void
  buildRedirectUrl(string $callbackUrl, string $from, ?string $code = null, ?string $returnTo = null): string
  applyScheduledCallback(ResponseEvent $event): void   // unchanged signature
  ```

- [ ] **Step 1: Write the failing tests**

Replace the two `scheduleLoginCallback` call sites in the existing test file with the new
signature, and add these cases:

```php
    public function testScheduleLoginMintsCodeAndAppendsIt(): void
    {
        $sessionStorage = $this->createStub(SessionStorage::class);
        $sessionStorage->method('getLoginSuccessCallback')->willReturn('https://laioutr.example.com/adopt');

        $codeService = $this->createStub(SessionHandoffCodeService::class);
        $codeService->method('generateCode')->willReturn('minted-code');

        $store = $this->createMock(SessionHandoffStore::class);
        $store->expects(static::once())->method('issue')->with(
            'minted-code',
            'ctx-token',
            'sales-channel-id',
            null,
            null,
            null,
        );

        $redirector = new CallbackRedirector($sessionStorage, $codeService, $store);

        $request = new Request();
        $redirector->scheduleLoginCallback($request, 'ctx-token', 'sales-channel-id', 'frontend.account.login', false);

        $event = $this->responseEvent($request, new Response('original'));
        $redirector->applyScheduledCallback($event);

        static::assertSame(
            'https://laioutr.example.com/adopt?from=frontend.account.login&code=minted-code',
            $event->getResponse()->headers->get('Location'),
        );
    }

    public function testCarriesShopwareRedirectTargetAsReturnTo(): void
    {
        $sessionStorage = $this->createStub(SessionStorage::class);
        $sessionStorage->method('getLoginSuccessCallback')->willReturn('https://laioutr.example.com/adopt');

        $codeService = $this->createStub(SessionHandoffCodeService::class);
        $codeService->method('generateCode')->willReturn('minted-code');

        $redirector = new CallbackRedirector(
            $sessionStorage,
            $codeService,
            $this->createStub(SessionHandoffStore::class),
        );

        $request = Request::create('https://shop.example.com/account/login');
        $redirector->scheduleLoginCallback($request, 'ctx-token', 'sales-channel-id', 'frontend.account.login', true);

        $event = $this->responseEvent($request, new RedirectResponse('/checkout/confirm'));
        $redirector->applyScheduledCallback($event);

        static::assertSame(
            'https://laioutr.example.com/adopt?from=frontend.account.login&code=minted-code'
            . '&return-to=https%3A%2F%2Fshop.example.com%2Fcheckout%2Fconfirm',
            $event->getResponse()->headers->get('Location'),
        );
    }

    public function testOmitsReturnToWhenResponseIsNotARedirect(): void
    {
        $sessionStorage = $this->createStub(SessionStorage::class);
        $sessionStorage->method('getLoginSuccessCallback')->willReturn('https://laioutr.example.com/adopt');

        $codeService = $this->createStub(SessionHandoffCodeService::class);
        $codeService->method('generateCode')->willReturn('minted-code');

        $redirector = new CallbackRedirector(
            $sessionStorage,
            $codeService,
            $this->createStub(SessionHandoffStore::class),
        );

        $request = Request::create('https://shop.example.com/account/login');
        $redirector->scheduleLoginCallback($request, 'ctx-token', 'sales-channel-id', 'frontend.account.login', true);

        $event = $this->responseEvent($request, new Response('rendered'));
        $redirector->applyScheduledCallback($event);

        static::assertStringNotContainsString('return-to', (string) $event->getResponse()->headers->get('Location'));
    }

    public function testScheduleLogoutAppendsNoCode(): void
    {
        $sessionStorage = $this->createStub(SessionStorage::class);
        $sessionStorage->method('getLogoutSuccessCallback')->willReturn('https://laioutr.example.com/adopt');

        $store = $this->createMock(SessionHandoffStore::class);
        $store->expects(static::never())->method('issue');

        $redirector = new CallbackRedirector(
            $sessionStorage,
            $this->createStub(SessionHandoffCodeService::class),
            $store,
        );

        $request = new Request();
        $redirector->scheduleLogoutCallback($request, 'frontend.account.logout', false);

        $event = $this->responseEvent($request, new Response('original'));
        $redirector->applyScheduledCallback($event);

        static::assertSame(
            'https://laioutr.example.com/adopt?from=frontend.account.logout',
            $event->getResponse()->headers->get('Location'),
        );
    }

    public function testMintsNoCodeWhenNoCallbackIsConfigured(): void
    {
        $store = $this->createMock(SessionHandoffStore::class);
        $store->expects(static::never())->method('issue');

        $redirector = new CallbackRedirector(
            $this->createStub(SessionStorage::class),
            $this->createStub(SessionHandoffCodeService::class),
            $store,
        );

        $redirector->scheduleLoginCallback(new Request(), 'ctx-token', 'sales-channel-id', 'frontend.account.login', true);
    }
```

Add a `responseEvent` helper mirroring `AuthBridgeNotifierTest`'s:

```php
    private function responseEvent(Request $request, Response $response): ResponseEvent
    {
        return new ResponseEvent(
            $this->createStub(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $response,
        );
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `vendor/bin/phpunit --filter CallbackRedirectorTest`
Expected: FAIL — constructor arity and unknown method arguments.

- [ ] **Step 3: Implement**

```php
class CallbackRedirector
{
    private const CALLBACK_URL_ATTRIBUTE = '_laioutr_callback_url';
    private const FROM_ATTRIBUTE = '_laioutr_callback_from';
    private const CODE_ATTRIBUTE = '_laioutr_callback_code';
    private const CARRY_RETURN_ATTRIBUTE = '_laioutr_callback_carry_return';

    public function __construct(
        private readonly SessionStorage $sessionStorage,
        private readonly SessionHandoffCodeService $codeService,
        private readonly SessionHandoffStore $store,
    ) {
    }

    /**
     * Schedule the post-login bounce to laioutr, carrying a single-use code for the rotated
     * context token. Shopware rotates that token on login, so without the code laioutr keeps
     * the pre-login one and reads the shopper as a guest.
     *
     * `$carryReturn` sends the shopper back to wherever Shopware was taking them. Set it
     * wherever the login is incidental to what the shopper was doing — a login inside checkout
     * must not end with them on laioutr.
     */
    public function scheduleLoginCallback(
        Request $request,
        string $contextToken,
        string $salesChannelId,
        string $from,
        bool $carryReturn,
    ): void {
        $callbackUrl = $this->sessionStorage->getLoginSuccessCallback();
        if ($callbackUrl === null) {
            return;
        }

        $code = $this->codeService->generateCode();
        $this->store->issue($code, $contextToken, $salesChannelId, null, null, null);
        $request->attributes->set(self::CODE_ATTRIBUTE, $code);

        $this->scheduleCallback($request, $callbackUrl, $from, $carryReturn);
    }

    /** No code: an absent code is how the far side is told to clear rather than adopt. */
    public function scheduleLogoutCallback(Request $request, string $from, bool $carryReturn): void
    {
        $this->scheduleCallback($request, $this->sessionStorage->getLogoutSuccessCallback(), $from, $carryReturn);
    }

    public function applyScheduledCallback(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $callbackUrl = $request->attributes->get(self::CALLBACK_URL_ATTRIBUTE);
        $from = $request->attributes->get(self::FROM_ATTRIBUTE);

        if (!\is_string($callbackUrl) || !\is_string($from)) {
            return;
        }

        $response = $event->getResponse();
        $returnTo = null;

        // Only a redirect names a destination worth returning to; a rendered page means the
        // shopper is already where they asked to be.
        if ($request->attributes->get(self::CARRY_RETURN_ATTRIBUTE) === true && $response instanceof RedirectResponse) {
            $returnTo = $this->toAbsoluteUrl($request, $response->getTargetUrl());
        }

        $code = $request->attributes->get(self::CODE_ATTRIBUTE);

        $event->setResponse(new RedirectResponse($this->buildRedirectUrl(
            $callbackUrl,
            $from,
            \is_string($code) ? $code : null,
            $returnTo,
        )));
    }

    public function buildRedirectUrl(
        string $callbackUrl,
        string $from,
        ?string $code = null,
        ?string $returnTo = null,
    ): string {
        $fragmentPosition = strpos($callbackUrl, '#');
        $fragment = '';

        if ($fragmentPosition !== false) {
            $fragment = substr($callbackUrl, $fragmentPosition);
            $callbackUrl = substr($callbackUrl, 0, $fragmentPosition);
        }

        $separator = str_contains($callbackUrl, '?') ? '&' : '?';
        if (str_ends_with($callbackUrl, '?') || str_ends_with($callbackUrl, '&')) {
            $separator = '';
        }

        $params = ['from' => $from];
        if ($code !== null) {
            $params['code'] = $code;
        }
        if ($returnTo !== null) {
            $params['return-to'] = $returnTo;
        }

        return $callbackUrl . $separator . http_build_query(
            $params,
            '',
            '&',
            \PHP_QUERY_RFC3986,
        ) . $fragment;
    }

    private function toAbsoluteUrl(Request $request, string $target): string
    {
        if (preg_match('#^https?://#i', $target) === 1) {
            return $target;
        }

        return $request->getSchemeAndHttpHost() . '/' . ltrim($target, '/');
    }

    private function scheduleCallback(Request $request, ?string $callbackUrl, string $from, bool $carryReturn): void
    {
        if ($callbackUrl === null) {
            return;
        }

        $request->attributes->set(self::CALLBACK_URL_ATTRIBUTE, $callbackUrl);
        $request->attributes->set(self::FROM_ATTRIBUTE, $from);
        $request->attributes->set(self::CARRY_RETURN_ATTRIBUTE, $carryReturn);
    }
}
```

Add the imports: `SessionHandoffCodeService`, `SessionHandoffStore`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `vendor/bin/phpunit --filter CallbackRedirectorTest`
Expected: PASS.

---

## Task 2: Wire the two subscribers

**Files:**
- Modify: `src/Session/Subscriber/AuthSubscriber.php`, `src/Session/Subscriber/RouteSubscriber.php`
- Test: `tests/Unit/Session/Subscriber/AuthSubscriberTest.php`, `tests/Unit/Session/Subscriber/RouteSubscriberTest.php`

**Interfaces:**
- Consumes: the Task 1 signatures.
- Produces: nothing new; behaviour only.

- [ ] **Step 1: Update the existing expectations to the new call shape**

In `AuthSubscriberTest`, the un-embedded login expectation becomes:

```php
        $callbackRedirector
            ->expects(static::once())
            ->method('scheduleLoginCallback')
            ->with($request, 'ctx-token', 'sales-channel-id', 'frontend.account.login', true);
```

and the logout expectation:

```php
        $callbackRedirector
            ->expects(static::once())
            ->method('scheduleLogoutCallback')
            ->with($request, 'frontend.account.logout', true);
```

In `RouteSubscriberTest`, the account-page expectation becomes:

```php
        $callbackRedirector
            ->expects(static::once())
            ->method('scheduleLoginCallback')
            ->with($request, 'ctx-token', 'sales-channel-id', 'frontend.account.home.page', false);
```

Read each test file first and match its existing stub setup for `SalesChannelContext` —
`getToken()` and `getSalesChannelId()` must return the values asserted above.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `vendor/bin/phpunit --filter 'AuthSubscriberTest|RouteSubscriberTest'`
Expected: FAIL on argument mismatch.

- [ ] **Step 3: Implement**

`AuthSubscriber::onLoginSuccess`, replacing the final line:

```php
        // The shopper keeps whatever they were doing: a login inside checkout must return
        // there, not end on laioutr.
        $this->callbackRedirector->scheduleLoginCallback(
            $request,
            $context->getToken(),
            $context->getSalesChannelId(),
            $route,
            true,
        );
```

`AuthSubscriber::onLogoutSuccess`:

```php
        $this->callbackRedirector->scheduleLogoutCallback($request, $route, true);
```

`RouteSubscriber::onPageLoaded`, replacing the final line:

```php
        // No return: these are pages laioutr renders itself, so keeping the shopper there is
        // the whole point of the bounce.
        $this->callbackRedirector->scheduleLoginCallback(
            $request,
            $context->getToken(),
            $context->getSalesChannelId(),
            $route,
            false,
        );
```

- [ ] **Step 4: Run the whole connector suite and PHPStan**

Run: `vendor/bin/phpunit && vendor/bin/phpstan analyse`
Expected: PASS, `[OK] No errors`.

---

## Task 3: Connector README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the mode and the bounce**

In the "Embedded storefront mode" section, after the paragraph on lockdown-without-embedded,
add:

```markdown
In that redirect setup the storefront is reached at top level, so it keeps its own session and
no provider ever sees a frame. What it costs instead is session sync: Shopware rotates the
context token when a shopper logs in, registers or checks out as a guest, and Laioutr cannot
see that happen in another cookie jar. So a login or logout bounces the browser through
Laioutr's adopt endpoint and straight back to where Shopware was sending it — the shopper stays
in checkout, and both sides end up on the same token. Callback redirects carry `from`, a
single-use `code` for the rotated token on login only, and `return-to` when there is a
destination to resume. The Shopware context token itself still never appears in a URL.
```

Update the existing line "Callback redirects append only the URL-encoded `from` route." to
match the three parameters above, keeping the sentence about the context token.

- [ ] **Step 2: Verify the claim about `return-to`**

Confirm by reading `CallbackRedirector::applyScheduledCallback` that `return-to` is present only
when `carryReturn` is set and the response is a redirect.

---

## Task 4: `checkoutMode` module option

**Files:**
- Modify: `src/module.ts`

**Interfaces:**
- Produces: `ModuleOptions.checkoutMode?: 'embedded' | 'redirect'`, and
  `RuntimeConfigModulePublic.checkoutMode: 'embedded' | 'redirect'`.

- [ ] **Step 1: Add the option**

In `ModuleOptions`, after `storefrontUrl`:

```ts
  /**
   * How a shopper reaches the Shopware checkout. `embedded` frames the storefront on a Laioutr
   * checkout page; `redirect` navigates the browser to the storefront at top level, which is
   * the only way redirect-based payment providers work without a break-out.
   *
   * Must match the plugin's embedded-mode setting: nothing enforces agreement, and a mismatch
   * serves a chrome-less storefront loading a bridge with no parent frame.
   */
  checkoutMode?: 'embedded' | 'redirect';
```

In `RuntimeConfigModulePublic`, after `storefrontOrigin`:

```ts
  /** Mirrors {@link ModuleOptions.checkoutMode}; the checkout section reads it. */
  checkoutMode: 'embedded' | 'redirect';
```

- [ ] **Step 2: Default it and expose it**

Add a `defaults` key to the `defineNuxtModule` call, beside `meta`:

```ts
  defaults: {
    checkoutMode: 'embedded',
  },
```

and extend the public runtime config:

```ts
    nuxt.options.runtimeConfig.public[name] = defu(nuxt.options.runtimeConfig.public[name] as any, {
      storefrontOrigin: options.storefrontUrl ? new URL(options.storefrontUrl).origin : '',
      checkoutMode: options.checkoutMode ?? 'embedded',
    });
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm dev:prepare && pnpm test:types`
Expected: no new errors beyond the known `#imports`-in-server-routes baseline.

---

## Task 5: The cart's checkout link branches on the mode

**Files:**
- Create: `src/runtime/server/shopware-helper/checkoutLink.ts`
- Create: `src/runtime/server/shopware-helper/checkoutLink.test.ts`
- Modify: `src/runtime/server/orchestr/cart/base.resolver.ts`

**Interfaces:**
- Consumes: `CHECKOUT_ENDPOINT_PATH`, the `Checkout` page-type token, `Link` from `@laioutr-core/core-types/common`.
- Produces: `resolveCheckoutLink(params: { storefrontUrl?: string; checkoutMode?: 'embedded' | 'redirect'; origin?: string }): Link | undefined`

The redirect href must be absolute — a relative one is claimed by frontend-core's catch-all
route and never reaches the server handler. `defineShopware.extendRequest` exposes `origin`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveCheckoutLink } from './checkoutLink';

describe('resolveCheckoutLink', () => {
  it('links to the merchant’s Studio checkout page in embedded mode', () => {
    expect(resolveCheckoutLink({ storefrontUrl: 'https://shop.example.com', checkoutMode: 'embedded' })).toEqual({
      type: 'pageType',
      pageType: 'shopware/checkout',
    });
  });

  it('defaults to embedded when no mode is configured', () => {
    expect(resolveCheckoutLink({ storefrontUrl: 'https://shop.example.com' })).toEqual({
      type: 'pageType',
      pageType: 'shopware/checkout',
    });
  });

  it('links straight to the handoff route in redirect mode, needing no Studio page', () => {
    expect(resolveCheckoutLink({ storefrontUrl: 'https://shop.example.com', checkoutMode: 'redirect' })).toEqual({
      type: 'url',
      href: '/app-shopware/checkout',
    });
  });

  it('offers no link at all when no storefront is configured', () => {
    expect(resolveCheckoutLink({ checkoutMode: 'redirect' })).toBeUndefined();
    expect(resolveCheckoutLink({ checkoutMode: 'embedded' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/runtime/server/shopware-helper/checkoutLink.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { CHECKOUT_ENDPOINT_PATH } from '../const/checkout';
import { Checkout } from '../../shared/pageTypes/checkout.pagetype';
import type { Link } from '@laioutr-core/core-types/common';

/**
 * Where the cart's checkout button points.
 *
 * Embedded, that is the merchant's Studio checkout page, which hosts the frame. Redirecting,
 * there is no laioutr checkout page at all — the button is a plain anchor to the handoff route,
 * which mints a code and 302s to the storefront.
 *
 * Both are gated on `storefrontUrl`: with no storefront configured there is no checkout to
 * offer.
 */
export const resolveCheckoutLink = (params: {
  storefrontUrl?: string;
  checkoutMode?: 'embedded' | 'redirect';
}): Link | undefined => {
  if (!params.storefrontUrl) {
    return undefined;
  }

  return params.checkoutMode === 'redirect' ?
      { type: 'url', href: CHECKOUT_ENDPOINT_PATH }
    : { type: 'pageType', pageType: Checkout };
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/runtime/server/shopware-helper/checkoutLink.test.ts`
Expected: PASS.

- [ ] **Step 5: Use it in the resolver**

In `base.resolver.ts`, replace the `checkoutLink` block and its comment with:

```ts
    const checkoutLink = resolveCheckoutLink(config);
```

Delete the now-unused `Link` and `Checkout` imports and add
`import { resolveCheckoutLink } from '../../shopware-helper/checkoutLink';` in sorted position.
Keep the surrounding comment's intent by moving it into the helper's docblock (done in Step 3);
do not leave a duplicate above the call.

- [ ] **Step 6: Run the suite**

Run: `pnpm vitest run`
Expected: PASS.

---

## Task 6: `resolveCheckout` points the auth callbacks at the adopt route

**Files:**
- Modify: `src/runtime/server/shopware-helper/resolveCheckout.ts`
- Test: `src/runtime/server/shopware-helper/resolveCheckout.test.ts`

**Interfaces:**
- Consumes: `ADOPT_SESSION_ENDPOINT_PATH` from `../const/checkout`.
- Produces: `ResolveCheckoutDeps.config` gains `checkoutMode?: 'embedded' | 'redirect'`.

- [ ] **Step 1: Write the failing test**

Add to `resolveCheckout.test.ts`:

```ts
  it('points the auth callbacks at the adopt route in redirect mode, so a storefront login syncs back', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({
      config: { ...config, checkoutMode: 'redirect' },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(mint).toHaveBeenCalledWith({
      endpoint: 'https://shop.example.com/store-api',
      accessToken: 'sw-key',
      contextToken: 'ctx-token',
      loginSuccessCallback: 'https://store.laioutr.com/app-shopware/adopt-session',
      logoutSuccessCallback: 'https://store.laioutr.com/app-shopware/adopt-session',
      redirectRoute: 'frontend.checkout.confirm.page',
    });
  });

  it('lets an explicit SSO callback override the adopt route', async () => {
    const mint = vi.fn().mockResolvedValue('the-code');

    await resolveCheckout({
      config: { ...config, checkoutMode: 'redirect', checkoutLoginCallbackUrl: 'https://idp.example.com/login' },
      contextToken: 'ctx-token',
      origin: 'https://store.laioutr.com',
      mint,
    });

    expect(mint.mock.calls[0][0].loginSuccessCallback).toBe('https://idp.example.com/login');
  });
```

The existing embedded-mode test already asserts `loginSuccessCallback: 'https://store.laioutr.com'`
and must keep passing unchanged — that is the regression guard for the default.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/runtime/server/shopware-helper/resolveCheckout.test.ts`
Expected: FAIL — the adopt path is not appended.

- [ ] **Step 3: Implement**

Add `checkoutMode?: 'embedded' | 'redirect';` to `ResolveCheckoutDeps['config']`, import
`ADOPT_SESSION_ENDPOINT_PATH`, and inside the `try` before the `mint` call:

```ts
    // Redirecting, laioutr and the storefront no longer share a browsing context, so a
    // storefront login has to bounce through the adopt route to reach this side at all.
    const authCallback =
      config.checkoutMode === 'redirect' ? `${origin}${ADOPT_SESSION_ENDPOINT_PATH}` : origin;
```

then use it:

```ts
      loginSuccessCallback: config.checkoutLoginCallbackUrl ?? authCallback,
      logoutSuccessCallback: config.checkoutLogoutCallbackUrl ?? authCallback,
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/runtime/server/shopware-helper/resolveCheckout.test.ts`
Expected: PASS, including the untouched embedded-mode cases.

---

## Task 7: `resolveReturnTo` validates the bounce destination

**Files:**
- Create: `src/runtime/server/shopware-helper/resolveReturnTo.ts`
- Create: `src/runtime/server/shopware-helper/resolveReturnTo.test.ts`

**Interfaces:**
- Produces: `resolveReturnTo(returnTo: unknown, storefrontUrl: string | undefined): string`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveReturnTo } from './resolveReturnTo';

const storefront = 'https://shop.example.com';

describe('resolveReturnTo', () => {
  it('returns a target on the configured storefront origin', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm', storefront)).toBe(
      'https://shop.example.com/checkout/confirm'
    );
  });

  it('preserves the query the storefront put on it', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm?step=2', storefront)).toBe(
      'https://shop.example.com/checkout/confirm?step=2'
    );
  });

  it('refuses a foreign origin rather than becoming an open redirect', () => {
    expect(resolveReturnTo('https://evil.example.com/steal', storefront)).toBe('/');
  });

  it('refuses a look-alike host', () => {
    expect(resolveReturnTo('https://shop.example.com.evil.test/steal', storefront)).toBe('/');
  });

  it('refuses a scheme downgrade on the right host', () => {
    expect(resolveReturnTo('http://shop.example.com/checkout/confirm', storefront)).toBe('/');
  });

  it('refuses a relative path, which names no origin to check', () => {
    expect(resolveReturnTo('/checkout/confirm', storefront)).toBe('/');
  });

  it('falls back when the value is absent, empty or not a string', () => {
    expect(resolveReturnTo(undefined, storefront)).toBe('/');
    expect(resolveReturnTo('', storefront)).toBe('/');
    expect(resolveReturnTo(['https://shop.example.com/a'], storefront)).toBe('/');
  });

  it('falls back when no storefront is configured to compare against', () => {
    expect(resolveReturnTo('https://shop.example.com/checkout/confirm', undefined)).toBe('/');
  });

  it('falls back on an unparseable value', () => {
    expect(resolveReturnTo('http://[', storefront)).toBe('/');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/runtime/server/shopware-helper/resolveReturnTo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
/**
 * Validate the destination a storefront auth bounce asks to be sent back to.
 *
 * The value arrives in a URL the browser followed, so anyone can craft one; only the configured
 * storefront origin is honoured and everything else falls back to the laioutr root. Comparing
 * parsed origins rather than string prefixes is what rejects a look-alike host.
 */
export const resolveReturnTo = (returnTo: unknown, storefrontUrl: string | undefined): string => {
  if (typeof returnTo !== 'string' || returnTo === '' || !storefrontUrl) {
    return '/';
  }

  try {
    const target = new URL(returnTo);
    return target.origin === new URL(storefrontUrl).origin ? target.href : '/';
  } catch {
    return '/';
  }
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/runtime/server/shopware-helper/resolveReturnTo.test.ts`
Expected: PASS.

---

## Task 8: The GET adopt-session route

**Files:**
- Create: `src/runtime/server/routes/adopt-session.get.ts`
- Modify: `src/module.ts`

**Interfaces:**
- Consumes: `adoptSession` (Task-independent, already exists), `resolveReturnTo` (Task 7),
  `adoptSessionToken`, `persistContextToken`, `clearContextToken`.

- [ ] **Step 1: Write the handler**

```ts
import { consola } from 'consola';
import { defineEventHandler, getQuery, sendRedirect, useRuntimeConfig } from '#imports';
import { adoptSessionToken } from '../shopware-helper/adoptSession';
import { clearContextToken, persistContextToken } from '../shopware-helper/persistContextToken';
import { adoptSession } from '../shopware-helper/resolveAdoptSession';
import { resolveReturnTo } from '../shopware-helper/resolveReturnTo';

const log = consola.withTag('shopware/adopt-session');

/**
 * Landing route for the storefront's auth bounce in redirect checkout mode.
 *
 * Shopware rotates the context token on login, register and guest checkout, and redirecting
 * puts that in a cookie jar laioutr cannot read. So the storefront sends the browser here with
 * a single-use code, which is redeemed server-to-server into an httpOnly cookie — the token
 * never reaches the browser — before bouncing the shopper back to where they were.
 *
 * The code is consumed by this request and deliberately left out of the redirect: it is
 * single-use, and one still sitting in the address bar gets replayed on reload.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()['@laioutr/app-shopware'];
  const query = getQuery(event);
  const code = typeof query.code === 'string' ? query.code : null;

  try {
    await adoptSession({
      config: { endpoint: config.endpoint, accessToken: config.accessToken },
      code,
      adopt: adoptSessionToken,
      persist: (token) => persistContextToken(event, token),
      clear: () => clearContextToken(event),
    });
  } catch (cause) {
    // Stranding a shopper mid-checkout is worse than reading them as logged out, which is the
    // whole cost of a failed redeem.
    log.warn('Failed to adopt the storefront session on the auth bounce', cause);
  }

  return sendRedirect(event, resolveReturnTo(query['return-to'], config.storefrontUrl), 302);
});
```

- [ ] **Step 2: Register it**

In `src/module.ts`, immediately after the existing POST adopt-session handler:

```ts
    // GET counterpart for redirect checkout mode: the storefront bounces the browser here on a
    // login or logout, and this redeems the code before sending it back (see
    // server/routes/adopt-session.get.ts).
    addServerHandler({
      route: ADOPT_SESSION_ENDPOINT_PATH,
      method: 'get',
      handler: resolveRuntimeModule('./server/routes/adopt-session.get'),
    });
```

- [ ] **Step 3: Verify it builds and the suite is green**

Run: `pnpm dev:prepare && pnpm vitest run`
Expected: PASS.

---

## Task 9: The section warns when it is placed in redirect mode

**Files:**
- Modify: `src/runtime/app/sections/SectionShopwareCheckout.vue`

- [ ] **Step 1: Add the warning**

Add `useRuntimeConfig` to the existing `#imports` import in sorted position, and after the
`route` / `frame` declarations:

```ts
if (import.meta.dev && useRuntimeConfig().public['@laioutr/app-shopware']?.checkoutMode === 'redirect') {
  console.warn(
    '[app-shopware] SectionShopwareCheckout does nothing in redirect checkout mode — the cart links straight to the storefront.'
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm dev:prepare && pnpm lint`
Expected: clean apart from the two known pre-existing `byAlias.template.ts` warnings.

---

## Task 10: App README and changeset

**Files:**
- Modify: `README.md`
- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Document the mode**

Add a section to the README covering: what `checkoutMode` does, that it must match the plugin's
embedded-mode setting, that redirect mode needs no Studio checkout page, that the success page
comes from the plugin's **Order success page** field, and that the Laioutr domain must be listed
in the plugin's **Allowed callback domains**.

- [ ] **Step 2: Write the changeset**

`minor` for `@laioutr/app-shopware`. Written for the package consumer: a new `checkoutMode`
option that sends shoppers to the storefront checkout at top level instead of framing it, what
it requires on the Shopware side, and that it needs a connector build carrying the auth bounce.
No build internals, no refactor lists.

Check `.changeset/` first — if an unreleased entry already covers this area, rewrite it rather
than adding a sibling.

- [ ] **Step 3: Final verification**

Connector: `vendor/bin/phpunit && vendor/bin/phpstan analyse`
App: `pnpm dev:prepare && pnpm vitest run && pnpm lint && pnpm test:types`
Expected: green, with only the known pre-existing warnings.
