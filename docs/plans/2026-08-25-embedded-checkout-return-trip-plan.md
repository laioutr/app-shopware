# Embedded Checkout Return Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the top-level checkout break-out, return the shopper to Laioutr on both exits from `/checkout/order` — the confirmation page when the order completed, and a re-framed `edit-order` when payment failed or was cancelled.

**Architecture:** The handoff row carries the return targets, so nothing depends on a storefront session surviving the payment provider. A `KernelEvents::RESPONSE` subscriber watches the finish and edit-order routes and swaps the response for a redirect to those targets. Per-sales-channel plugin config supplies fallbacks, which is the sole source in the un-embedded topology. Decision logic lives in pure classes; subscribers only wire them, matching `RouteBlocklist` / `LockdownSubscriber`.

**Tech Stack:** Shopware 6.7 (PHP 8.5, Symfony, Doctrine DBAL, PHPUnit 12), Nuxt module (TypeScript, Vitest, Vue 3).

**Spec:** `docs/plans/2026-08-25-embedded-checkout-payment-breakout-design.md` (§4)

## Global Constraints

- Two repos. Connector: `/Users/sl/src/shopware-laioutr-integration`. App: `/Users/sl/src/app-shopware`.
- Connector tests run in Docker: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist`. The repo is bind-mounted, so edits are live. Run `docker exec shopware-dev-web-1 php bin/console cache:clear` after touching `config.xml`, `services.yaml` or routes.
- Connector static analysis: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress` — must report `[OK] No errors`.
- App: run `pnpm dev:prepare` before `pnpm lint`. `pnpm test:types` has a pre-existing failing baseline (~263 errors from unresolved `#imports` in server routes); do not treat it as a gate, but do not add errors outside that class.
- Every callback URL is validated with `DomainWhitelistValidator::isValidUrl()` before use. Never redirect to an unvalidated URL.
- Money and currency rules do not apply here; no amounts are handled.
- Comments explain **why**, never restate the line below. Never cite this plan or the spec from code, comments, test names or error messages.
- Conventional commits, Angular style. Connector uses release-please, so `feat:` / `fix:` matter.
- Commit only at the steps that say commit. Do not push.

---

## File Structure

**Connector — new**

| File | Responsibility |
| --- | --- |
| `src/Migration/Migration1787700000AddHandoffReturnTargets.php` | Adds three nullable columns to `laioutr_session_handoff` |
| `src/Embedded/Business/CheckoutReturnDecision.php` | Pure: given a route, a response and the stored targets, returns a redirect URL or `null` |
| `src/Embedded/Subscriber/CheckoutReturnSubscriber.php` | Wires the decision to `KernelEvents::RESPONSE` |
| `src/Session/Business/ReturnTargetResolver.php` | Pure-ish: session value first, plugin-config fallback second, both domain-validated |

**Connector — modified**

| File | Change |
| --- | --- |
| `src/Session/Integration/SessionHandoff.php` | Three new readonly properties |
| `src/Session/Integration/SessionHandoffStore.php` | `issue()` / `redeem()` carry them |
| `src/Session/StoreApi/Controller/SessionHandoffController.php` | Accepts the three new body parameters |
| `src/Session/Storefront/Controller/ConnectController.php` | Stores targets on redeem; generates the redirect with route params |
| `src/Session/Integration/SessionStorage.php` | Accessors for the two stored targets |
| `src/Embedded/EmbeddedConfig.php` | Two fallback config keys |
| `src/Resources/config/config.xml` | Two fallback URL fields |
| `src/Resources/config/services.yaml` | Registers the new services |

**App — modified**

| File | Change |
| --- | --- |
| `src/runtime/server/shopware-helper/sessionHandoff.ts` | Mint accepts the return targets and route params |
| `src/runtime/server/shopware-helper/resolveCheckout.ts` | Supports a retry target |
| `src/runtime/server/routes/checkout.ts` | Reads `?retry-order=` |
| `src/runtime/server/routes/order-handoff.post.ts` | Forwards the two URLs from the body |
| `src/runtime/shared/const/checkout.ts` | Retry route name and query key |
| `src/runtime/app/sections/SectionShopwareCheckout.vue` | Passes both URLs down; forwards `?retry-order=` |
| `src/runtime/app/components/ShopwareEmbedFrame.vue` | Sends both URLs when minting; frame `src` carries the retry order id |

---

## Task 1: Handoff carries return targets

**Files:**
- Create: `src/Migration/Migration1787700000AddHandoffReturnTargets.php`
- Modify: `src/Session/Integration/SessionHandoff.php`
- Modify: `src/Session/Integration/SessionHandoffStore.php`
- Test: `tests/Integration/Session/Integration/SessionHandoffStoreTest.php`

**Interfaces:**
- Produces: `SessionHandoff` gains `public readonly ?string $finishSuccessCallback`, `public readonly ?string $checkoutCallback`, `public readonly ?array $redirectRouteParams` (in that order, after `$redirectRoute`). `SessionHandoffStore::issue()` gains the same three as trailing parameters in the same order.

- [ ] **Step 1: Write the failing test**

Append to `tests/Integration/Session/Integration/SessionHandoffStoreTest.php`:

```php
public function testIssueAndRedeemCarryReturnTargets(): void
{
    $code = static::getContainer()->get(SessionHandoffCodeService::class)->generateCode();

    static::getContainer()->get(SessionHandoffStore::class)->issue(
        $code,
        'ctx-token',
        $this->getSalesChannelId(),
        'http://localhost/login',
        'http://localhost/logout',
        'frontend.account.edit-order.page',
        'http://localhost/thank-you',
        'http://localhost/checkout',
        ['orderId' => '01a038f7f84672b2b9a943e6586716ab'],
    );

    $handoff = static::getContainer()->get(SessionHandoffStore::class)->redeem($code);

    static::assertNotNull($handoff);
    static::assertSame('http://localhost/thank-you', $handoff->finishSuccessCallback);
    static::assertSame('http://localhost/checkout', $handoff->checkoutCallback);
    static::assertSame(['orderId' => '01a038f7f84672b2b9a943e6586716ab'], $handoff->redirectRouteParams);
}

public function testReturnTargetsDefaultToNull(): void
{
    $code = static::getContainer()->get(SessionHandoffCodeService::class)->generateCode();

    static::getContainer()->get(SessionHandoffStore::class)->issue(
        $code,
        'ctx-token',
        $this->getSalesChannelId(),
        null,
        null,
        'frontend.checkout.confirm.page',
    );

    $handoff = static::getContainer()->get(SessionHandoffStore::class)->redeem($code);

    static::assertNotNull($handoff);
    static::assertNull($handoff->finishSuccessCallback);
    static::assertNull($handoff->checkoutCallback);
    static::assertNull($handoff->redirectRouteParams);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter SessionHandoffStoreTest`
Expected: FAIL — `issue()` does not accept 9 arguments.

- [ ] **Step 3: Add the migration**

Create `src/Migration/Migration1787700000AddHandoffReturnTargets.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1787700000AddHandoffReturnTargets extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1787700000;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(<<<'SQL'
            ALTER TABLE `laioutr_session_handoff`
                ADD COLUMN `finish_success_callback` VARCHAR(2048) NULL AFTER `redirect_route`,
                ADD COLUMN `checkout_callback` VARCHAR(2048) NULL AFTER `finish_success_callback`,
                ADD COLUMN `redirect_route_params` JSON NULL AFTER `checkout_callback`;
        SQL);
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
```

- [ ] **Step 4: Extend the struct**

In `src/Session/Integration/SessionHandoff.php`, add three promoted properties after `$redirectRoute`:

```php
        public readonly ?string $redirectRoute,
        public readonly ?string $finishSuccessCallback = null,
        public readonly ?string $checkoutCallback = null,
        /** @var array<string, string>|null */
        public readonly ?array $redirectRouteParams = null,
```

- [ ] **Step 5: Carry them through the store**

In `src/Session/Integration/SessionHandoffStore.php`, extend `issue()`:

```php
    /**
     * @param array<string, string>|null $redirectRouteParams
     */
    public function issue(
        string $code,
        string $contextToken,
        string $salesChannelId,
        ?string $loginSuccessCallback,
        ?string $logoutSuccessCallback,
        ?string $redirectRoute,
        ?string $finishSuccessCallback = null,
        ?string $checkoutCallback = null,
        ?array $redirectRouteParams = null,
    ): void {
```

Add to the `insert()` payload, alongside the existing columns:

```php
            'finish_success_callback' => $finishSuccessCallback,
            'checkout_callback' => $checkoutCallback,
            'redirect_route_params' => $redirectRouteParams === null
                ? null
                : json_encode($redirectRouteParams, \JSON_THROW_ON_ERROR),
```

In `redeem()`, add the columns to the `SELECT` list:

```php
                            redirect_route,
                            finish_success_callback,
                            checkout_callback,
                            redirect_route_params
```

and extend the returned struct:

```php
                return new SessionHandoff(
                    self::requireString($row['context_token']),
                    self::requireString($row['sales_channel_id']),
                    self::nullableString($row['login_success_callback']),
                    self::nullableString($row['logout_success_callback']),
                    self::nullableString($row['redirect_route']),
                    self::nullableString($row['finish_success_callback']),
                    self::nullableString($row['checkout_callback']),
                    self::decodeParams($row['redirect_route_params']),
                );
```

Add the decoder as a private static method next to `nullableString()`:

```php
    /**
     * @return array<string, string>|null
     */
    private static function decodeParams(mixed $value): ?array
    {
        $json = self::nullableString($value);
        if ($json === null) {
            return null;
        }

        $decoded = json_decode($json, true, 512, \JSON_THROW_ON_ERROR);

        return \is_array($decoded) ? $decoded : null;
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist`
Expected: PASS, all tests. The test bootstrap force-installs the plugin, which runs the migration.

- [ ] **Step 7: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 8: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Migration/Migration1787700000AddHandoffReturnTargets.php \
        src/Session/Integration/SessionHandoff.php \
        src/Session/Integration/SessionHandoffStore.php \
        tests/Integration/Session/Integration/SessionHandoffStoreTest.php
git commit -m "feat: carry checkout return targets on the session handoff"
```

---

## Task 2: Store-API mint accepts the return targets

**Files:**
- Modify: `src/Session/StoreApi/Controller/SessionHandoffController.php`
- Test: `tests/Integration/Session/StoreApi/Controller/SessionHandoffControllerApiTest.php`

**Interfaces:**
- Consumes: `SessionHandoffStore::issue(..., ?string $finishSuccessCallback, ?string $checkoutCallback, ?array $redirectRouteParams)` from Task 1.
- Produces: `POST /store-api/laioutr/session-handoff` accepts three optional body keys — `finish-success-callback` (string), `checkout-callback` (string), `redirect-route-params` (object of string values). Both callbacks are rejected with 400 when present and not on an allowed domain.

- [ ] **Step 1: Write the failing test**

Append to `tests/Integration/Session/StoreApi/Controller/SessionHandoffControllerApiTest.php`:

```php
/**
 * @param array<string, mixed> $body
 */
private function issue(array $body): Response
{
    $browser = $this->getSalesChannelBrowser();
    $browser->request(
        'POST',
        '/store-api/laioutr/session-handoff',
        [],
        [],
        ['CONTENT_TYPE' => 'application/json'],
        json_encode($body, \JSON_THROW_ON_ERROR),
    );

    return $browser->getResponse();
}

public function testIssueRejectsDisallowedFinishCallback(): void
{
    $response = $this->issue([
        'login-success-callback' => 'https://allowed.example/login',
        'logout-success-callback' => 'https://allowed.example/logout',
        'redirect-route' => 'frontend.checkout.confirm.page',
        'finish-success-callback' => 'https://not-allowed.example/thanks',
    ]);

    static::assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
}

public function testIssueAcceptsAllowedReturnTargets(): void
{
    $response = $this->issue([
        'login-success-callback' => 'https://allowed.example/login',
        'logout-success-callback' => 'https://allowed.example/logout',
        'redirect-route' => 'frontend.checkout.confirm.page',
        'finish-success-callback' => 'https://allowed.example/thank-you',
        'checkout-callback' => 'https://allowed.example/checkout',
    ]);

    static::assertSame(Response::HTTP_OK, $response->getStatusCode());

    $content = json_decode((string) $response->getContent(), true, flags: \JSON_THROW_ON_ERROR);
    static::assertNotEmpty($content['code'] ?? null);
}
```

`setUp()` in this file already allows `allowed.example`, which is why the URLs above use it.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter SessionHandoffControllerApiTest`
Expected: FAIL — the disallowed callback is accepted, so the first test gets 200 instead of 400.

- [ ] **Step 3: Read and validate the new parameters**

In `SessionHandoffController::issue()`, after the existing required parameters:

```php
        $finishSuccessCallback = $this->getOptionalBodyParameter($request, 'finish-success-callback');
        $checkoutCallback = $this->getOptionalBodyParameter($request, 'checkout-callback');

        foreach ([$finishSuccessCallback, $checkoutCallback] as $callback) {
            if ($callback !== null && !$this->domainWhitelistValidator->isValidUrl($callback)) {
                throw new BadRequestHttpException('Callback domain is not allowed');
            }
        }

        $redirectRouteParams = $request->request->all()['redirect-route-params'] ?? null;
        if ($redirectRouteParams !== null && !\is_array($redirectRouteParams)) {
            throw new BadRequestHttpException('Parameter "redirect-route-params" must be an object');
        }
```

Pass them to the store call:

```php
        $this->store->issue(
            $code,
            $context->getToken(),
            $context->getSalesChannelId(),
            $loginSuccessCallback,
            $logoutSuccessCallback,
            $redirectRoute,
            $finishSuccessCallback,
            $checkoutCallback,
            $redirectRouteParams,
        );
```

Add the reader next to `getRequiredBodyParameter()`:

```php
    private function getOptionalBodyParameter(Request $request, string $name): ?string
    {
        $value = $request->request->all()[$name] ?? null;

        if ($value === null) {
            return null;
        }

        if (!\is_string($value) || trim($value) === '') {
            throw new BadRequestHttpException(sprintf('Parameter "%s" must be a non-empty string', $name));
        }

        return $value;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist`
Expected: PASS, all tests.

- [ ] **Step 5: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 6: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Session/StoreApi/Controller/SessionHandoffController.php \
        tests/Integration/Session/StoreApi/Controller/SessionHandoffControllerApiTest.php
git commit -m "feat: accept checkout return targets when minting a handoff code"
```

---

## Task 3: Fallback URLs in the plugin config

**Files:**
- Create: `src/Session/Business/ReturnTargetResolver.php`
- Create: `tests/Unit/Session/Business/ReturnTargetResolverTest.php`
- Modify: `src/Embedded/EmbeddedConfig.php`
- Modify: `src/Resources/config/config.xml`
- Modify: `src/Resources/config/services.yaml`
- Modify: `src/Session/Integration/SessionStorage.php`

**Interfaces:**
- Produces: `ReturnTargetResolver::resolveFinishTarget(?string $salesChannelId): ?string` and `::resolveCheckoutTarget(?string $salesChannelId): ?string`. Both return the session value when set, otherwise the configured fallback, otherwise `null`. Both return `null` for a URL that fails domain validation. `SessionStorage` gains `getFinishSuccessCallback()`, `setFinishSuccessCallback(?string)`, `getCheckoutCallback()`, `setCheckoutCallback(?string)` — the setters accept `null` to clear.
- `EmbeddedConfig::FINISH_FALLBACK_URL = 'LaioutrConnector.config.finishFallbackUrl'` and `EmbeddedConfig::CHECKOUT_FALLBACK_URL = 'LaioutrConnector.config.checkoutFallbackUrl'`.

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/Session/Business/ReturnTargetResolverTest.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Tests\Unit\Session\Business;

use Laioutr\Connector\Embedded\EmbeddedConfig;
use Laioutr\Connector\Session\Business\DomainWhitelistValidator;
use Laioutr\Connector\Session\Business\ReturnTargetResolver;
use Laioutr\Connector\Session\Integration\SessionStorage;
use PHPUnit\Framework\TestCase;
use Shopware\Core\System\SystemConfig\SystemConfigService;

class ReturnTargetResolverTest extends TestCase
{
    private function resolver(?string $sessionValue, string $configValue, bool $urlAllowed): ReturnTargetResolver
    {
        $storage = $this->createMock(SessionStorage::class);
        $storage->method('getFinishSuccessCallback')->willReturn($sessionValue);

        $config = $this->createMock(SystemConfigService::class);
        $config->method('getString')->with(EmbeddedConfig::FINISH_FALLBACK_URL, null)->willReturn($configValue);

        $validator = $this->createMock(DomainWhitelistValidator::class);
        $validator->method('isValidUrl')->willReturn($urlAllowed);

        return new ReturnTargetResolver($storage, $config, $validator);
    }

    public function testSessionValueWins(): void
    {
        static::assertSame(
            'http://localhost/from-session',
            $this->resolver('http://localhost/from-session', 'http://localhost/from-config', true)
                ->resolveFinishTarget(null),
        );
    }

    public function testFallsBackToConfig(): void
    {
        static::assertSame(
            'http://localhost/from-config',
            $this->resolver(null, 'http://localhost/from-config', true)->resolveFinishTarget(null),
        );
    }

    public function testReturnsNullWhenNeitherIsSet(): void
    {
        static::assertNull($this->resolver(null, '', true)->resolveFinishTarget(null));
    }

    public function testRejectsDisallowedDomain(): void
    {
        static::assertNull(
            $this->resolver('https://not-allowed.example/x', '', false)->resolveFinishTarget(null),
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter ReturnTargetResolverTest`
Expected: FAIL — `ReturnTargetResolver` does not exist.

- [ ] **Step 3: Add the config keys**

In `src/Embedded/EmbeddedConfig.php`, add two constants below the existing ones:

```php
    public const FINISH_FALLBACK_URL = 'LaioutrConnector.config.finishFallbackUrl';
    public const CHECKOUT_FALLBACK_URL = 'LaioutrConnector.config.checkoutFallbackUrl';
```

- [ ] **Step 4: Add the session accessors**

In `src/Session/Integration/SessionStorage.php`, add two key constants and four methods following the existing pattern. The setters must accept `null` so a redemption can clear a stale target:

```php
    private const FINISH_SUCCESS_CALLBACK_KEY = 'laioutr-finish-success-callback';
    private const CHECKOUT_CALLBACK_KEY = 'laioutr-checkout-callback';

    public function getFinishSuccessCallback(): ?string
    {
        return $this->get(self::FINISH_SUCCESS_CALLBACK_KEY);
    }

    public function setFinishSuccessCallback(?string $callback): void
    {
        $this->set(self::FINISH_SUCCESS_CALLBACK_KEY, $callback ?? '');
    }

    public function getCheckoutCallback(): ?string
    {
        return $this->get(self::CHECKOUT_CALLBACK_KEY);
    }

    public function setCheckoutCallback(?string $callback): void
    {
        $this->set(self::CHECKOUT_CALLBACK_KEY, $callback ?? '');
    }
```

`get()` already treats an empty string as absent, so writing `''` clears the value.

- [ ] **Step 5: Write the resolver**

Create `src/Session/Business/ReturnTargetResolver.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Session\Business;

use Laioutr\Connector\Embedded\EmbeddedConfig;
use Laioutr\Connector\Session\Integration\SessionStorage;
use Shopware\Core\System\SystemConfig\SystemConfigService;

/**
 * Where to send a shopper who has finished, or failed to finish, a checkout that left the frame.
 *
 * The session value is written when a handoff is redeemed and describes the checkout in progress.
 * The configured fallback is the durable half: it survives a session the payment provider destroyed,
 * and it is the only source at all when the storefront is not embedded, because there is no section
 * to supply one.
 */
class ReturnTargetResolver
{
    public function __construct(
        private readonly SessionStorage $sessionStorage,
        private readonly SystemConfigService $systemConfigService,
        private readonly DomainWhitelistValidator $domainWhitelistValidator,
    ) {
    }

    public function resolveFinishTarget(?string $salesChannelId): ?string
    {
        return $this->resolve(
            $this->sessionStorage->getFinishSuccessCallback(),
            EmbeddedConfig::FINISH_FALLBACK_URL,
            $salesChannelId,
        );
    }

    public function resolveCheckoutTarget(?string $salesChannelId): ?string
    {
        return $this->resolve(
            $this->sessionStorage->getCheckoutCallback(),
            EmbeddedConfig::CHECKOUT_FALLBACK_URL,
            $salesChannelId,
        );
    }

    private function resolve(?string $sessionValue, string $configKey, ?string $salesChannelId): ?string
    {
        $candidate = $sessionValue;

        if ($candidate === null) {
            $configured = trim($this->systemConfigService->getString($configKey, $salesChannelId));
            $candidate = $configured === '' ? null : $configured;
        }

        if ($candidate === null || !$this->domainWhitelistValidator->isValidUrl($candidate)) {
            return null;
        }

        return $candidate;
    }
}
```

- [ ] **Step 6: Register the service**

In `src/Resources/config/services.yaml`, below `DomainWhitelistValidator`:

```yaml
    Laioutr\Connector\Session\Business\ReturnTargetResolver: ~
```

- [ ] **Step 7: Add the config fields**

In `src/Resources/config/config.xml`, inside the `Embedded storefront` card, after `lockdownAdditionalBlockedRoutes`:

```xml
        <input-field type="url">
            <name>finishFallbackUrl</name>
            <label>Order success page</label>
            <label lang="de-DE">Bestellbestätigungsseite</label>
            <helpText>Absolute URL of the Laioutr page a shopper reaches after a completed order. The order id is appended as ?order=. Must be an allowed callback domain. Leave empty to show Shopware's own confirmation page.</helpText>
            <helpText lang="de-DE">Absolute URL der Laioutr-Seite, die Kunden nach einer abgeschlossenen Bestellung erreichen. Die Bestell-ID wird als ?order= angehängt. Muss eine erlaubte Callback-Domain sein. Leer lassen, um Shopwares eigene Bestätigungsseite zu zeigen.</helpText>
        </input-field>

        <input-field type="url">
            <name>checkoutFallbackUrl</name>
            <label>Checkout page (payment retry)</label>
            <label lang="de-DE">Checkout-Seite (Zahlungswiederholung)</label>
            <helpText>Absolute URL of the Laioutr checkout page a shopper returns to when a payment fails or is cancelled. Only used in embedded mode; un-embedded, the storefront handles the retry itself. Must be an allowed callback domain.</helpText>
            <helpText lang="de-DE">Absolute URL der Laioutr-Checkout-Seite, zu der Kunden zurückkehren, wenn eine Zahlung fehlschlägt oder abgebrochen wird. Nur im eingebetteten Modus verwendet; ohne Einbettung übernimmt der Storefront die Wiederholung selbst. Muss eine erlaubte Callback-Domain sein.</helpText>
        </input-field>
```

- [ ] **Step 8: Run tests to verify they pass**

Run:
```bash
docker exec shopware-dev-web-1 php bin/console cache:clear
docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist
```
Expected: PASS, all tests. Then verify the XML parses: `xmllint --noout src/Resources/config/config.xml`

- [ ] **Step 9: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 10: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Session/Business/ReturnTargetResolver.php \
        tests/Unit/Session/Business/ReturnTargetResolverTest.php \
        src/Embedded/EmbeddedConfig.php \
        src/Session/Integration/SessionStorage.php \
        src/Resources/config/config.xml \
        src/Resources/config/services.yaml
git commit -m "feat: add fallback return URLs to the plugin configuration"
```

---

## Task 4: Redemption stores the targets and honours route params

**Files:**
- Modify: `src/Session/Storefront/Controller/ConnectController.php`
- Test: `tests/Integration/ConnectorRouteTest.php`

**Interfaces:**
- Consumes: `SessionHandoff` return-target properties (Task 1), `SessionStorage` setters (Task 3).
- Produces: both `connect-session` and `checkout-order` write both targets on every redemption, writing `null` when the handoff carries none. `connect-session` generates its redirect with `$handoff->redirectRouteParams`, so a handoff can target `frontend.account.edit-order.page`.

- [ ] **Step 1: Write the failing test**

Append to `tests/Integration/ConnectorRouteTest.php`:

```php
public function testConnectSessionHonoursRouteParameters(): void
{
    $code = static::getContainer()->get(SessionHandoffCodeService::class)->generateCode();
    static::getContainer()->get(SessionHandoffStore::class)->issue(
        $code,
        'test-context-token',
        $this->getSalesChannelId(),
        'http://localhost/login-callback',
        'http://localhost/logout-callback',
        'frontend.account.edit-order.page',
        null,
        null,
        ['orderId' => '01a038f7f84672b2b9a943e6586716ab'],
    );

    $response = $this->request('GET', 'laioutr/connect-session', ['code' => $code]);

    static::assertSame(Response::HTTP_FOUND, $response->getStatusCode());
    static::assertSame(
        '/account/order/edit/01a038f7f84672b2b9a943e6586716ab',
        $response->headers->get('Location'),
    );
}

public function testConnectSessionClearsStaleReturnTargets(): void
{
    static::getContainer()->get(SessionStorage::class)->setFinishSuccessCallback('http://localhost/stale');

    $code = static::getContainer()->get(SessionHandoffCodeService::class)->generateCode();
    static::getContainer()->get(SessionHandoffStore::class)->issue(
        $code,
        'test-context-token',
        $this->getSalesChannelId(),
        'http://localhost/login-callback',
        'http://localhost/logout-callback',
        'frontend.checkout.confirm.page',
    );

    $this->request('GET', 'laioutr/connect-session', ['code' => $code]);

    // A handoff that carries no target must not leave the previous one in place.
    static::assertNull(static::getContainer()->get(SessionStorage::class)->getFinishSuccessCallback());
}
```

Add the imports the file does not already have: `Laioutr\Connector\Session\Integration\SessionStorage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter ConnectorRouteTest`
Expected: FAIL — the first test gets a URL generation error or a route without its `orderId`; the second still finds the stale value.

- [ ] **Step 3: Generate the redirect with parameters**

In `ConnectController::connectSession()`, replace the URL generation:

```php
        try {
            $redirectUrl = $this->urlGenerator->generate(
                $handoff->redirectRoute,
                $handoff->redirectRouteParams ?? [],
            );
        } catch (RouteNotFoundException $exception) {
            throw new BadRequestHttpException('Handoff redirect route is not registered', $exception);
        }
```

Add `Symfony\Component\Routing\Exception\MissingMandatoryParametersException` to the caught types on the same `catch`, so a handoff missing a required parameter fails closed with a 400 rather than a 500:

```php
        } catch (RouteNotFoundException|MissingMandatoryParametersException $exception) {
```

- [ ] **Step 4: Store the targets on every redemption**

In `ConnectController::installSession()`, after the existing callback writes and before `regenerate()`:

```php
        $this->sessionStorage->setFinishSuccessCallback($handoff->finishSuccessCallback);
        $this->sessionStorage->setCheckoutCallback($handoff->checkoutCallback);
```

Both setters accept `null`, so a handoff carrying no target clears whatever the previous checkout left behind. `installSession()` runs for both `connect-session` and `checkout-order`, so no further change is needed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist`
Expected: PASS, all tests.

- [ ] **Step 6: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 7: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Session/Storefront/Controller/ConnectController.php tests/Integration/ConnectorRouteTest.php
git commit -m "feat: store checkout return targets and honour handoff route parameters"
```

---

## Task 5: The return decision

**Files:**
- Create: `src/Embedded/Business/CheckoutReturnDecision.php`
- Create: `tests/Unit/Embedded/Business/CheckoutReturnDecisionTest.php`

**Interfaces:**
- Produces: `CheckoutReturnDecision::decide(string $route, int $statusCode, ?string $location, ?string $orderId, ?string $finishTarget, ?string $checkoutTarget, bool $embedded): ?string` — returns an absolute URL to redirect to, or `null` to leave the response alone. Pure: no Symfony, no session, no config.

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/Embedded/Business/CheckoutReturnDecisionTest.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Tests\Unit\Embedded\Business;

use Laioutr\Connector\Embedded\Business\CheckoutReturnDecision;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class CheckoutReturnDecisionTest extends TestCase
{
    private const FINISH = 'frontend.checkout.finish.page';
    private const EDIT = 'frontend.account.edit-order.page';
    private const THANKS = 'http://localhost/thank-you';
    private const CHECKOUT = 'http://localhost/checkout';

    #[DataProvider('caseProvider')]
    public function testDecide(
        string $route,
        int $status,
        ?string $location,
        ?string $orderId,
        bool $embedded,
        ?string $expected,
    ): void {
        $decision = new CheckoutReturnDecision();

        static::assertSame($expected, $decision->decide(
            $route,
            $status,
            $location,
            $orderId,
            self::THANKS,
            self::CHECKOUT,
            $embedded,
        ));
    }

    public static function caseProvider(): iterable
    {
        yield 'paid, session intact' => [self::FINISH, 200, null, 'ord1', true, self::THANKS . '?order=ord1'];
        yield 'paid, session lost' => [self::FINISH, 302, '/account/register', 'ord1', true, self::THANKS . '?order=ord1'];
        yield 'paid, un-embedded' => [self::FINISH, 200, null, 'ord1', false, self::THANKS . '?order=ord1'];
        yield 'finish without an order id' => [self::FINISH, 200, null, null, true, null];
        yield 'payment failed via finish' => [
            self::FINISH, 302, '/account/order/edit/ord1', 'ord1', true,
            self::CHECKOUT . '?retry-order=ord1',
        ];
        yield 'cart error' => [self::FINISH, 302, '/checkout/cart', 'ord1', true, null];
        yield 'edit-order embedded' => [self::EDIT, 200, null, 'ord1', true, self::CHECKOUT . '?retry-order=ord1'];
        yield 'edit-order un-embedded is left alone' => [self::EDIT, 200, null, 'ord1', false, null];
        yield 'unrelated route' => ['frontend.account.home.page', 200, null, 'ord1', true, null];
    }

    public function testFinishFallsThroughWithoutATarget(): void
    {
        $decision = new CheckoutReturnDecision();

        static::assertNull($decision->decide(self::FINISH, 200, null, 'ord1', null, self::CHECKOUT, true));
    }

    public function testRetryFallsThroughWithoutATarget(): void
    {
        $decision = new CheckoutReturnDecision();

        static::assertNull($decision->decide(self::EDIT, 200, null, 'ord1', self::THANKS, null, true));
    }

    public function testErrorCodeIsForwarded(): void
    {
        $decision = new CheckoutReturnDecision();

        static::assertSame(
            self::CHECKOUT . '?retry-order=ord1&error-code=CHECKOUT__CUSTOMER_CANCELED_EXTERNAL_PAYMENT',
            $decision->decide(
                self::EDIT,
                200,
                null,
                'ord1',
                self::THANKS,
                self::CHECKOUT,
                true,
                'CHECKOUT__CUSTOMER_CANCELED_EXTERNAL_PAYMENT',
            ),
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter CheckoutReturnDecisionTest`
Expected: FAIL — `CheckoutReturnDecision` does not exist.

- [ ] **Step 3: Write the decision**

Create `src/Embedded/Business/CheckoutReturnDecision.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Embedded\Business;

/**
 * Where a checkout that left the frame should send the shopper, given how Shopware answered.
 *
 * Reaching the finish route at all means the payment succeeded — a failed finalize goes to the
 * payment token's error URL instead — so the finish route's own outcome is what distinguishes a
 * completed order from a failed one.
 */
class CheckoutReturnDecision
{
    public const FINISH_ROUTE = 'frontend.checkout.finish.page';
    public const EDIT_ORDER_ROUTE = 'frontend.account.edit-order.page';

    private const REGISTER_PATH = '/account/register';
    private const EDIT_ORDER_PATH = '/account/order/edit';

    public function decide(
        string $route,
        int $statusCode,
        ?string $location,
        ?string $orderId,
        ?string $finishTarget,
        ?string $checkoutTarget,
        bool $embedded,
        ?string $errorCode = null,
    ): ?string {
        if ($orderId === null) {
            return null;
        }

        if ($route === self::EDIT_ORDER_ROUTE) {
            // Un-embedded there is no frame to return to, and the storefront handles the retry in
            // full with its own header and footer.
            return $embedded ? $this->retryUrl($checkoutTarget, $orderId, $errorCode) : null;
        }

        if ($route !== self::FINISH_ROUTE) {
            return null;
        }

        if ($statusCode < 300) {
            return $this->finishUrl($finishTarget, $orderId);
        }

        if ($location !== null && str_contains($location, self::REGISTER_PATH)) {
            // The session did not survive the provider. The order exists and was paid.
            return $this->finishUrl($finishTarget, $orderId);
        }

        if ($location !== null && str_contains($location, self::EDIT_ORDER_PATH)) {
            return $embedded ? $this->retryUrl($checkoutTarget, $orderId, $errorCode) : null;
        }

        return null;
    }

    private function finishUrl(?string $target, string $orderId): ?string
    {
        return $target === null ? null : $target . $this->separator($target) . 'order=' . rawurlencode($orderId);
    }

    private function retryUrl(?string $target, string $orderId, ?string $errorCode): ?string
    {
        if ($target === null) {
            return null;
        }

        $url = $target . $this->separator($target) . 'retry-order=' . rawurlencode($orderId);

        return $errorCode === null ? $url : $url . '&error-code=' . rawurlencode($errorCode);
    }

    private function separator(string $url): string
    {
        return str_contains($url, '?') ? '&' : '?';
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter CheckoutReturnDecisionTest`
Expected: PASS, 12 tests.

- [ ] **Step 5: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 6: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Embedded/Business/CheckoutReturnDecision.php tests/Unit/Embedded/Business/CheckoutReturnDecisionTest.php
git commit -m "feat: add the checkout return decision"
```

---

## Task 6: Wire the decision to responses

**Files:**
- Create: `src/Embedded/Subscriber/CheckoutReturnSubscriber.php`
- Modify: `src/Resources/config/services.yaml`
- Test: `tests/Integration/Embedded/CheckoutReturnSubscriberTest.php`

**Interfaces:**
- Consumes: `CheckoutReturnDecision::decide()` (Task 5), `ReturnTargetResolver` (Task 3), `EmbeddedConfig::EMBEDDED_MODE`.
- Produces: nothing other tasks call. This is the connector's terminal behaviour.

- [ ] **Step 1: Write the failing test**

Create `tests/Integration/Embedded/CheckoutReturnSubscriberTest.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Tests\Integration\Embedded;

use Laioutr\Connector\Embedded\EmbeddedConfig;
use Laioutr\Connector\Session\Business\DomainWhitelistValidator;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;
use Shopware\Core\System\SystemConfig\SystemConfigService;
use Shopware\Storefront\Test\Controller\StorefrontControllerTestBehaviour;
use Symfony\Component\HttpFoundation\Response;

class CheckoutReturnSubscriberTest extends TestCase
{
    use IntegrationTestBehaviour;
    use StorefrontControllerTestBehaviour;

    protected function setUp(): void
    {
        $config = static::getContainer()->get(SystemConfigService::class);
        $config->set(DomainWhitelistValidator::CONFIG_KEY, 'localhost');
        $config->set(EmbeddedConfig::EMBEDDED_MODE, true);
    }

    public function testFinishRedirectsToTheConfiguredSuccessPage(): void
    {
        static::getContainer()->get(SystemConfigService::class)
            ->set(EmbeddedConfig::FINISH_FALLBACK_URL, 'http://localhost/thank-you');

        // No session, so the finish route answers with its register redirect — the "session lost"
        // case, which the fallback exists to rescue.
        $response = $this->request('GET', 'checkout/finish', ['orderId' => 'ord1']);

        static::assertSame(Response::HTTP_FOUND, $response->getStatusCode());
        static::assertSame('http://localhost/thank-you?order=ord1', $response->headers->get('Location'));
    }

    public function testFinishIsLeftAloneWithoutATarget(): void
    {
        static::getContainer()->get(SystemConfigService::class)
            ->set(EmbeddedConfig::FINISH_FALLBACK_URL, '');

        $response = $this->request('GET', 'checkout/finish', ['orderId' => 'ord1']);

        static::assertFalse(
            $response->isRedirect('http://localhost/thank-you?order=ord1'),
            'Without a configured target the finish route must be left as Shopware answered it',
        );
    }

    public function testFinishIsLeftAloneWithoutAnOrderId(): void
    {
        static::getContainer()->get(SystemConfigService::class)
            ->set(EmbeddedConfig::FINISH_FALLBACK_URL, 'http://localhost/thank-you');

        $response = $this->request('GET', 'checkout/finish', []);

        static::assertFalse(
            $response->isRedirect('http://localhost/thank-you?order='),
            'A finish hit with no order id must not be redirected',
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist --filter CheckoutReturnSubscriberTest`
Expected: FAIL — the first test sees Shopware's register redirect, not the configured URL.

- [ ] **Step 3: Write the subscriber**

Create `src/Embedded/Subscriber/CheckoutReturnSubscriber.php`:

```php
<?php

declare(strict_types=1);

namespace Laioutr\Connector\Embedded\Subscriber;

use Laioutr\Connector\Embedded\Business\CheckoutReturnDecision;
use Laioutr\Connector\Embedded\EmbeddedConfig;
use Laioutr\Connector\Session\Business\ReturnTargetResolver;
use Shopware\Core\PlatformRequest;
use Shopware\Core\System\SystemConfig\SystemConfigService;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Returns a shopper whose checkout left the frame to Laioutr, on both exits from the order route.
 *
 * This has to run at RESPONSE rather than REQUEST: the finish route redirects to the account's
 * order-edit page when the payment failed, and that outcome is only known once the page has loaded.
 */
class CheckoutReturnSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly CheckoutReturnDecision $decision,
        private readonly ReturnTargetResolver $returnTargetResolver,
        private readonly SystemConfigService $systemConfigService,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        // After CallbackRedirector (-1) and the frame-options listener (-2), so a callback the
        // auth bridge scheduled still wins.
        return [KernelEvents::RESPONSE => [['onResponse', -8]]];
    }

    public function onResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = $request->attributes->get('_route');
        if (!\is_string($route)) {
            return;
        }

        $salesChannelId = $request->attributes->get(PlatformRequest::ATTRIBUTE_SALES_CHANNEL_ID);
        $salesChannelId = \is_string($salesChannelId) ? $salesChannelId : null;

        $response = $event->getResponse();

        $target = $this->decision->decide(
            $route,
            $response->getStatusCode(),
            $response->headers->get('Location'),
            $this->resolveOrderId($request, $route),
            $this->returnTargetResolver->resolveFinishTarget($salesChannelId),
            $this->returnTargetResolver->resolveCheckoutTarget($salesChannelId),
            $this->systemConfigService->getBool(EmbeddedConfig::EMBEDDED_MODE, $salesChannelId),
            $this->stringOrNull($request->query->all()['error-code'] ?? null),
        );

        if ($target === null) {
            return;
        }

        $event->setResponse(new RedirectResponse($target, Response::HTTP_FOUND));
    }

    /**
     * The finish route carries the id in the query; the order-edit route carries it in the path.
     * Reading it from the request rather than the session keeps it available when the session did
     * not survive the payment provider.
     */
    private function resolveOrderId(Request $request, string $route): ?string
    {
        if ($route === CheckoutReturnDecision::EDIT_ORDER_ROUTE) {
            return $this->stringOrNull($request->attributes->get('orderId'));
        }

        return $this->stringOrNull($request->query->all()['orderId'] ?? null);
    }

    private function stringOrNull(mixed $value): ?string
    {
        return \is_string($value) && $value !== '' ? $value : null;
    }
}
```

- [ ] **Step 4: Register the subscriber**

In `src/Resources/config/services.yaml`, below `LockdownSubscriber`:

```yaml
    Laioutr\Connector\Embedded\Business\CheckoutReturnDecision: ~

    Laioutr\Connector\Embedded\Subscriber\CheckoutReturnSubscriber:
        tags:
            - kernel.event_subscriber
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
docker exec shopware-dev-web-1 php bin/console cache:clear
docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpunit --configuration phpunit.xml.dist
```
Expected: PASS, all tests.

- [ ] **Step 6: Static analysis**

Run: `docker exec -w /var/www/html/custom/plugins/LaioutrConnector shopware-dev-web-1 ../../../vendor/bin/phpstan analyze -c phpstan.neon.dist --no-progress`
Expected: `[OK] No errors`

- [ ] **Step 7: Tell the frame whether a return is configured**

The break-out must not happen when nothing can bring the shopper back. The plugin knows its
fallbacks; the section knows its own links. The plugin publishes its half so the parent can decide.

In `src/Resources/views/storefront/base.html.twig`, add to the embed script tag beside
`data-checkout-order-url`:

```twig
                data-return-fallback="{{ config('LaioutrConnector.config.finishFallbackUrl') ? '1' : '' }}"
```

In `src/Resources/public/laioutr-embed.js`, report it with the page load, so the parent sees it
before it mints anything:

```js
  function sendPageLoaded() {
    post("laioutr:page-loaded", {
      path: window.location.pathname,
      route: dataset.route || null,
      navigationId: dataset.navigationId || null,
      salesChannelId: dataset.salesChannelId || null,
      returnFallback: dataset.returnFallback === "1"
    });
  }
```

- [ ] **Step 8: Document the routes and settings**

In `README.md`, extend the **Embedded storefront mode** section with a bullet under the embedded-mode list:

```markdown
- **Return trip** — a checkout that left the frame is returned to Laioutr: a completed order redirects to the configured **Order success page** with `?order=`, and a failed or cancelled payment redirects to the **Checkout page** with `?retry-order=` and `&error-code=`. Un-embedded, only the success redirect applies; the storefront handles a retry itself.
```

Add a note to the lockdown paragraph that both URLs must be on an allowed callback domain.

- [ ] **Step 9: Commit**

```bash
cd /Users/sl/src/shopware-laioutr-integration
git add src/Embedded/Subscriber/CheckoutReturnSubscriber.php \
        src/Resources/config/services.yaml \
        src/Resources/views/storefront/base.html.twig \
        src/Resources/public/laioutr-embed.js \
        tests/Integration/Embedded/CheckoutReturnSubscriberTest.php \
        README.md
git commit -m "feat: return the shopper to laioutr after a checkout that left the frame"
```

---

## Task 7: Mint a retry handoff from the app

**Files:**
- Modify: `src/runtime/shared/const/checkout.ts`
- Modify: `src/runtime/server/shopware-helper/sessionHandoff.ts`
- Modify: `src/runtime/server/shopware-helper/resolveCheckout.ts`
- Modify: `src/runtime/server/routes/checkout.ts`
- Test: `src/runtime/server/shopware-helper/resolveCheckout.test.ts`

**Interfaces:**
- Produces: `MintSessionHandoffParams` gains `finishSuccessCallback?: string`, `checkoutCallback?: string`, `redirectRouteParams?: Record<string, string>`, sent as `finish-success-callback`, `checkout-callback` and `redirect-route-params`. `ResolveCheckoutDeps` gains `retryOrderId?: string | null`. `RETRY_ORDER_QUERY_KEY = 'retry-order'` and `CHECKOUT_RETRY_ROUTE = 'frontend.account.edit-order.page'` are exported from `runtime/shared/const/checkout.ts`.

- [ ] **Step 1: Write the failing test**

Append to `src/runtime/server/shopware-helper/resolveCheckout.test.ts`, matching the file's existing `deps` helper:

```ts
it('mints an edit-order handoff when a retry order is given', async () => {
  const mint = vi.fn().mockResolvedValue('code-1');

  const plan = await resolveCheckout({
    config: { endpoint: 'https://shop.example.com/store-api', accessToken: 'k', storefrontUrl: 'https://shop.example.com' },
    contextToken: 'ctx',
    origin: 'https://laioutr.example',
    retryOrderId: 'ord1',
    mint,
  });

  expect(mint).toHaveBeenCalledWith(
    expect.objectContaining({
      redirectRoute: 'frontend.account.edit-order.page',
      redirectRouteParams: { orderId: 'ord1' },
    }),
  );
  expect(plan).toEqual({ kind: 'redirect', url: expect.stringContaining('code-1') });
});

it('mints a confirm handoff when no retry order is given', async () => {
  const mint = vi.fn().mockResolvedValue('code-2');

  await resolveCheckout({
    config: { endpoint: 'https://shop.example.com/store-api', accessToken: 'k', storefrontUrl: 'https://shop.example.com' },
    contextToken: 'ctx',
    origin: 'https://laioutr.example',
    mint,
  });

  expect(mint).toHaveBeenCalledWith(
    expect.objectContaining({ redirectRoute: 'frontend.checkout.confirm.page' }),
  );
  expect(mint.mock.calls[0][0].redirectRouteParams).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/runtime/server/shopware-helper/resolveCheckout.test.ts`
Expected: FAIL — `redirectRoute` is always the confirm route and `redirectRouteParams` is never sent.

- [ ] **Step 3: Add the constants**

In `src/runtime/shared/const/checkout.ts`:

```ts
/**
 * Storefront route that can still take payment for an order whose cart is gone. A cancelled or
 * declined payment lands here, and the frame is pointed at it so the retry happens in place.
 */
export const CHECKOUT_RETRY_ROUTE = 'frontend.account.edit-order.page';

/** Query key the storefront uses to hand a failed order back for a retry. */
export const RETRY_ORDER_QUERY_KEY = 'retry-order';
```

Re-export both from `src/runtime/server/const/checkout.ts` alongside the existing paths.

- [ ] **Step 4: Extend the mint helper**

In `src/runtime/server/shopware-helper/sessionHandoff.ts`, add to `MintSessionHandoffParams`:

```ts
  /** Absolute URL of the Laioutr page shown after a completed order. */
  finishSuccessCallback?: string;
  /** Absolute URL of the Laioutr checkout page, used to re-frame a payment retry. */
  checkoutCallback?: string;
  /** Parameters for `redirectRoute`; the retry route is keyed by `orderId`. */
  redirectRouteParams?: Record<string, string>;
```

and to the request body, omitting keys that are undefined so an older plugin build still accepts the call:

```ts
      body: {
        'login-success-callback': params.loginSuccessCallback,
        'logout-success-callback': params.logoutSuccessCallback,
        'redirect-route': params.redirectRoute,
        ...(params.finishSuccessCallback ? { 'finish-success-callback': params.finishSuccessCallback } : {}),
        ...(params.checkoutCallback ? { 'checkout-callback': params.checkoutCallback } : {}),
        ...(params.redirectRouteParams ? { 'redirect-route-params': params.redirectRouteParams } : {}),
      },
```

- [ ] **Step 5: Resolve the retry target**

In `src/runtime/server/shopware-helper/resolveCheckout.ts`, add to `ResolveCheckoutDeps`:

```ts
  /** Order to retry payment for, from the storefront's `retry-order` bounce. */
  retryOrderId?: string | null;
```

and inside the `try` block, replace the `mint` call's route arguments:

```ts
    const code = await mint({
      endpoint: config.endpoint,
      accessToken: config.accessToken,
      contextToken,
      loginSuccessCallback: config.checkoutLoginCallbackUrl ?? origin,
      logoutSuccessCallback: config.checkoutLogoutCallbackUrl ?? origin,
      redirectRoute: retryOrderId ? CHECKOUT_RETRY_ROUTE : CHECKOUT_REDIRECT_ROUTE,
      ...(retryOrderId ? { redirectRouteParams: { orderId: retryOrderId } } : {}),
    });
```

Destructure `retryOrderId` from `deps` alongside the existing fields, and import `CHECKOUT_RETRY_ROUTE`.

- [ ] **Step 6: Read the query parameter**

In `src/runtime/server/routes/checkout.ts`, before the `resolveCheckout` call:

```ts
  const retryOrderId = getQuery(event)[RETRY_ORDER_QUERY_KEY];
```

and pass `retryOrderId: typeof retryOrderId === 'string' ? retryOrderId : null` into `resolveCheckout`. Add `getQuery` to the `#imports` import and `RETRY_ORDER_QUERY_KEY` to the const import.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/sl/src/app-shopware && pnpm vitest run`
Expected: PASS, all suites.

- [ ] **Step 8: Lint**

Run: `cd /Users/sl/src/app-shopware && pnpm dev:prepare && pnpm lint`
Expected: no errors; the two pre-existing `byAlias.template.ts` warnings remain.

- [ ] **Step 9: Commit**

```bash
cd /Users/sl/src/app-shopware
git add src/runtime/shared/const/checkout.ts \
        src/runtime/server/const/checkout.ts \
        src/runtime/server/shopware-helper/sessionHandoff.ts \
        src/runtime/server/shopware-helper/resolveCheckout.ts \
        src/runtime/server/routes/checkout.ts \
        src/runtime/server/shopware-helper/resolveCheckout.test.ts
git commit -m "feat(shopware): point the checkout frame at a payment retry when asked"
```

---

## Task 8: The section supplies the return URLs and forwards a retry

**Files:**
- Modify: `src/runtime/server/routes/order-handoff.post.ts`
- Modify: `src/runtime/app/sections/SectionShopwareCheckout.vue`
- Modify: `src/runtime/app/components/ShopwareEmbedFrame.vue`
- Test: `src/runtime/app/lib/createOrderHandoffRefresher.test.ts`

**Interfaces:**
- Consumes: `mintSessionHandoffCode` return-target parameters and `RETRY_ORDER_QUERY_KEY` (Task 7).
- Produces: `POST /app-shopware/order-handoff` accepts a JSON body `{ finishUrl?: string, checkoutUrl?: string }` and forwards both to the mint. `ShopwareEmbedFrame` gains props `finishUrl?: string`, `checkoutUrl?: string`, `retryOrderId?: string`. `BridgePageLoadedPayload` gains `returnFallback: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `src/runtime/app/lib/createOrderHandoffRefresher.test.ts`:

```ts
it('passes the return URLs to the mint on every tick', async () => {
  const mint = vi.fn().mockResolvedValue('code');
  const refresher = createOrderHandoffRefresher({ mint, deliver: vi.fn(), intervalMs: 1000 });

  refresher.start();
  await vi.advanceTimersByTimeAsync(1000);

  // The refresher must not cache the first result: the section can resolve its links after mount.
  expect(mint).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `pnpm vitest run src/runtime/app/lib/createOrderHandoffRefresher.test.ts`
Expected: PASS — the refresher already calls `mint` per tick. This test pins that behaviour before the caller starts depending on it. If it fails, fix the refresher before continuing.

- [ ] **Step 3: Accept the URLs at the mint endpoint**

In `src/runtime/server/routes/order-handoff.post.ts`, read the body and forward the values:

```ts
  const body = await readBody<{ finishUrl?: unknown; checkoutUrl?: unknown }>(event).catch(() => ({}));
  const finishUrl = typeof body?.finishUrl === 'string' ? body.finishUrl : undefined;
  const checkoutUrl = typeof body?.checkoutUrl === 'string' ? body.checkoutUrl : undefined;
```

and add them to the `mintSessionHandoffCode` call:

```ts
      finishSuccessCallback: finishUrl,
      checkoutCallback: checkoutUrl,
```

Add `readBody` to the `#imports` import.

- [ ] **Step 4: Send them from the frame**

In `src/runtime/app/components/ShopwareEmbedFrame.vue`, declare the props above `frameRef`:

```ts
const props = defineProps<{ finishUrl?: string; checkoutUrl?: string; retryOrderId?: string }>();
```

Change the refresher's `mint` to send them:

```ts
      const response = await $fetch<{ code: string }>(ORDER_HANDOFF_ENDPOINT_PATH, {
        method: 'POST',
        body: { finishUrl: props.finishUrl, checkoutUrl: props.checkoutUrl },
      });
```

Carry the retry order into the frame `src` so the handoff route can mint an edit-order target:

```ts
const frameSrc = computed(() =>
  props.retryOrderId
    ? `${CHECKOUT_ENDPOINT_PATH}?${RETRY_ORDER_QUERY_KEY}=${encodeURIComponent(props.retryOrderId)}`
    : CHECKOUT_ENDPOINT_PATH
);
```

and bind `:src="frameSrc"` on the `<iframe>` in place of `:src="CHECKOUT_ENDPOINT_PATH"`. Import `RETRY_ORDER_QUERY_KEY` from `../../shared/const/checkout`.

- [ ] **Step 5: Resolve and pass the URLs from the section**

In `src/runtime/app/sections/SectionShopwareCheckout.vue`, add a `checkoutLink` field to the schema in the `<script lang="ts">` block, beside `finishLink`:

```ts
        {
          type: 'link',
          name: 'checkoutLink',
          label: 'Checkout Page',
          description:
            'The page this section sits on. Used to bring the customer back here when a payment fails or is cancelled, so they can choose another method without leaving the site.',
        },
```

In the `<script setup>` block, resolve both links to absolute URLs and read the retry query:

```ts
const route = useRoute();

const toAbsolute = (path: string) =>
  import.meta.client ? new URL(path, window.location.origin).href : path;

const finishUrl = computed(() =>
  props.finishLink ? toAbsolute(linkResolver.resolve(props.finishLink)) : undefined
);
const checkoutUrl = computed(() =>
  props.checkoutLink ? toAbsolute(linkResolver.resolve(props.checkoutLink)) : undefined
);
const retryOrderId = computed(() => {
  const value = route.query[RETRY_ORDER_QUERY_KEY];
  return typeof value === 'string' ? value : undefined;
});
```

and bind them on the frame:

```vue
    <ShopwareEmbedFrame
      :finish-url="finishUrl"
      :checkout-url="checkoutUrl"
      :retry-order-id="retryOrderId"
      @checkout-finish="onCheckoutFinish"
      @auth-changed="onAuthChanged"
    />
```

Add `computed` and `useRoute` to the `#imports` import, and `RETRY_ORDER_QUERY_KEY` to the const import.

- [ ] **Step 6: Refuse to break out with no way back**

`parseBridgeMessage` rebuilds the payload from a fixed field list, so a new field is dropped unless
it is added there. In `src/runtime/app/lib/parseBridgeMessage.ts`, extend the `page-loaded` case:

```ts
            payload: {
              path: payload.path,
              route: typeof payload.route === 'string' ? payload.route : null,
              navigationId: typeof payload.navigationId === 'string' ? payload.navigationId : null,
              salesChannelId: typeof payload.salesChannelId === 'string' ? payload.salesChannelId : null,
              returnFallback: payload.returnFallback === true,
            },
```

Add `returnFallback: boolean` to the `laioutr:page-loaded` payload type in
`src/runtime/app/const/bridge.ts`.

Then gate the refresher in `ShopwareEmbedFrame.vue`, replacing the confirm-page branch:

```ts
  // Retargeting the form with no configured return would strand the shopper on a Shopware page at
  // the end of a successful order. Staying in the frame is the better degraded state.
  const canReturn = Boolean(props.finishUrl) || payload.returnFallback;

  if (payload.route === CHECKOUT_CONFIRM_ROUTE && canReturn) {
    handoff.start();
  } else {
    handoff.stop();
  }
```

Add a case to `src/runtime/app/lib/parseBridgeMessage.test.ts`:

```ts
it('defaults returnFallback to false when the storefront omits it', () => {
  const message = parseBridgeMessage({
    source: BRIDGE_SOURCE,
    version: BRIDGE_VERSION,
    type: 'laioutr:page-loaded',
    payload: { path: '/checkout/confirm' },
  });

  expect(message).toEqual({
    type: 'laioutr:page-loaded',
    payload: { path: '/checkout/confirm', route: null, navigationId: null, salesChannelId: null, returnFallback: false },
  });
});
```

Existing `page-loaded` assertions in that file and in `createBridgeHandler.test.ts` need
`returnFallback: false` added to their expected payloads.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/sl/src/app-shopware && pnpm vitest run`
Expected: PASS, all suites.

- [ ] **Step 8: Lint**

Run: `cd /Users/sl/src/app-shopware && pnpm dev:prepare && pnpm lint`
Expected: no errors.

- [ ] **Step 9: Write the changeset**

Rewrite `.changeset/wide-donkeys-shake.md` rather than adding a sibling — everything in `.changeset/` ships as one changelog section, so it must describe the feature at release:

```markdown
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
```

- [ ] **Step 10: Commit**

```bash
cd /Users/sl/src/app-shopware
git add src/runtime/server/routes/order-handoff.post.ts \
        src/runtime/app/sections/SectionShopwareCheckout.vue \
        src/runtime/app/components/ShopwareEmbedFrame.vue \
        src/runtime/app/const/bridge.ts \
        src/runtime/app/lib/parseBridgeMessage.ts \
        src/runtime/app/lib/parseBridgeMessage.test.ts \
        src/runtime/app/lib/createOrderHandoffRefresher.test.ts \
        .changeset/wide-donkeys-shake.md
git commit -m "feat(shopware): carry checkout return targets and re-frame a payment retry"
```

---

## Task 9: End-to-end verification

**Files:** none — this task changes nothing and produces evidence.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Configure the dev stack**

```bash
SC=$(docker exec shopware-dev-database-1 mariadb -uroot -proot shopware -N -B -e \
  "SELECT LOWER(HEX(sc.id)) FROM sales_channel sc JOIN sales_channel_domain d ON d.sales_channel_id = sc.id WHERE d.url = 'http://localhost:8000' LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
docker exec shopware-dev-web-1 php bin/console system:config:set -s "$SC" LaioutrConnector.config.finishFallbackUrl 'http://localhost:3000/checkout-success'
docker exec shopware-dev-web-1 php bin/console system:config:set -s "$SC" LaioutrConnector.config.checkoutFallbackUrl 'http://localhost:3000/checkout'
docker exec shopware-dev-web-1 php bin/console cache:clear
```

The allowed callback domains must already include `localhost`; check with
`docker exec shopware-dev-database-1 mariadb -uroot -proot shopware -N -B -e "SELECT configuration_value FROM system_config WHERE configuration_key='LaioutrConnector.config.callbackDomainWildcard';"`

- [ ] **Step 2: Verify the success path**

In a browser: add a product at `http://localhost:3000`, go to the checkout page, complete the guest form, choose PayPal, submit, and approve in the PayPal sandbox.

Expected: the browser ends on `http://localhost:3000/checkout-success?order=<id>`, never showing a Shopware page.

- [ ] **Step 3: Verify the retry path**

Repeat, but **cancel** in the PayPal sandbox.

Expected: the browser ends on `http://localhost:3000/checkout?retry-order=<id>&error-code=CHECKOUT__CUSTOMER_CANCELED_EXTERNAL_PAYMENT`, with the Shopware order-edit page rendered inside the frame — not a top-level `localhost:8000` page.

- [ ] **Step 4: Verify the un-embedded topology**

```bash
docker exec shopware-dev-web-1 php bin/console system:config:set -j -s "$SC" LaioutrConnector.config.embeddedModeEnabled false
docker exec shopware-dev-web-1 php bin/console cache:clear
```

Repeat the cancel flow.

Expected: the order-edit page renders on `localhost:8000` with its header and footer, and is **not** redirected. Then repeat the success flow and expect the redirect to `checkout-success` to still happen. Restore with `-j ... true` afterwards.

- [ ] **Step 5: Record the results**

Report which paths were exercised and what each produced. Do not claim the feature works for a path that was not run.
