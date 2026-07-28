# Laravel + Pest + Livewire Testing Guide

> Ready-to-use snippets for testing Laravel apps (Blade, Livewire, Folio) with Pest

**Status**: Piloted on a Laravel + Livewire + Folio training project

This is the Laravel counterpart of the [Nuxt guide](./README.md). The doctrine is identical — `data-test-*` selectors, exhaustive case plans in `task-test.md`, isolated deterministic tests, the permission matrix — only the tooling changes. Read `AGENTS.md` first; this guide is the cookbook, not the playbook.

**No JS bundler in the loop.** Blade/Livewire is server-rendered — there is no Vite/webpack/esbuild pipeline to hook `env-attr-cleaner` into, so **Part A (the cleaner) does not apply here**. To keep `data-test-*` out of production HTML, use a Blade directive gated on the environment instead (see "Stripping in production" below). The testing methodology (Part B) stands on its own regardless.

---

## Basic Configuration

### Installation

```bash
composer require pestphp/pest pestphp/pest-plugin-laravel pestphp/pest-plugin-livewire --dev
php artisan pest:install
```

For browser-level E2E, add either:

```bash
composer require pestphp/pest-plugin-browser --dev   # Pest v3 browser plugin (Playwright-backed)
# or
composer require laravel/dusk --dev && php artisan dusk:install
```

### phpunit.xml / Pest coverage

```xml
<coverage>
    <report>
        <html outputDirectory="coverage-html"/>
    </report>
</coverage>
<source>
    <include>
        <directory suffix=".php">app</directory>
    </include>
</source>
```

Run with a hard 90% floor, same as every other stack in this doctrine:

```bash
vendor/bin/pest --coverage --min=90
```

### tests/Pest.php

```php
uses(Tests\TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class)->in('Feature');
```

`RefreshDatabase` gives every test a fresh, seeded database — the Laravel equivalent of the fresh-store rule in the JS guides (Step 5.1: never share state across tests).

### Selector lint gate

The JS guides gate the selector rule mechanically with ESLint (`AGENTS.md` Step 3). PHP/Blade has no equivalent static-analysis rule for "don't select on CSS classes or text" — there is no runtime DOM to lint against ahead of time. Enforce it at **review time instead** (Step 5.0 Pass B, the `test-reviewer` sub-agent): reject any assertion using `->assertSeeText()`, `->assertSee()` on visible copy, or a raw CSS-class/tag selector where a `data-test-id` / `data-test-class` hook was possible. Treat this as a hard review-gate item, not a nice-to-have, since it cannot be caught by a red build the way the JS lint override is.

---

## Data Attributes Conventions

Same two attributes and naming rules as every other stack, written Blade-style:

```blade
<button data-test-id="login-submit" wire:click="submit">Se connecter</button>
<input type="email" data-test-id="login-email-input" wire:model="email" />
<div data-test-class="product-row">...</div>
```

- Name by **role**, never by style, color, or position.
- Livewire's `wire:*` bindings and Alpine's `x-*` attributes are untouched — `data-test-*` sits alongside them, not instead of them.
- Add the attribute directly in the Blade markup, static or with an expression (`data-test-id="product-{{ $product->id }}"` works the same way as the JS guides' dynamic/bound forms).

### Stripping in production

Since there's no bundler to strip the attribute at build time, use a Blade directive that no-ops outside non-production environments:

```php
// AppServiceProvider::boot()
Blade::if('testattr', fn () => ! app()->isProduction());
```

```blade
@testattr
    data-test-id="login-submit"
@endtestattr
```

This is a project-level choice (Step 2 equivalent) — ask the user before wiring it in, exactly as the JS guides gate `env-attr-cleaner` behind confirmation. If the project doesn't need the strip (internal tool, no untrusted users inspecting markup), it's fine to skip and leave the attributes always-on; note that decision in `task-test.md`.

---

## Core Cases

### Blade component / view — unique element and group

```php
it('exposes the unique hooks', function () {
    $this->get('/login')
        ->assertOk()
        ->assertSee('data-test-id="login-email-input"', false)
        ->assertSee('data-test-id="login-submit"', false);
});

it('renders one row per product (data-test-class)', function () {
    Product::factory()->count(3)->create();

    $this->get('/products')
        ->assertOk()
        ->assertSeeInOrder(
            array_fill(0, 3, 'data-test-class="product-row"'),
            false,
        );
});
```

`assertSee(..., false)` is checking raw HTML for the hook itself — not a violation of the "never select on text" rule, since the assertion targets the `data-test-*` attribute, not visible copy.

### Livewire component

```php
use Livewire\Livewire;
use App\Livewire\LoginForm;

it('logs in with valid credentials', function () {
    $user = User::factory()->create(['password' => bcrypt('secret123')]);

    Livewire::test(LoginForm::class)
        ->set('email', $user->email)
        ->set('password', 'secret123')
        ->call('submit')
        ->assertRedirect('/dashboard');
});

it('shows a validation error on invalid email', function () {
    Livewire::test(LoginForm::class)
        ->set('email', 'not-an-email')
        ->call('submit')
        ->assertHasErrors(['email' => 'email']);
});

it('disables the submit button while pending', function () {
    Livewire::test(LoginForm::class)
        ->set('email', 'user@example.com')
        ->set('password', 'secret123')
        ->call('submit')
        ->assertSet('isSubmitting', true);
});
```

`Livewire::test()` is the Livewire counterpart of `render()`/`mount()` in the JS guides — it drives the component's public properties and actions directly, no HTTP round-trip, no DOM. Assert observable **state** (`assertSet`, `assertHasErrors`, `assertRedirect`, `assertDispatched`) rather than rendered markup wherever the component exposes it — it's the Blade/Livewire equivalent of "assert behaviour, not implementation" (Step 5.0 Pass B, reviewer checklist).

### Assert a variant through state, not markup

Same rule as the JS guides' `data-test-state` pattern — expose the variant as a public property or a dedicated computed value, assert on that instead of parsing rendered HTML for a CSS class:

```php
it('flags the alert as destructive on a failed payment', function () {
    Livewire::test(PaymentAlert::class, ['status' => 'failed'])
        ->assertSet('variant', 'destructive');
});
```

### Mock HTTP with typed responses (Http::fake)

The Laravel equivalent of MSW — swap the outbound HTTP layer, never hit a real endpoint:

```php
it('shows the product list once the external catalog responds', function () {
    Http::fake([
        'catalog.example.com/products' => Http::response([
            ['id' => 1, 'name' => 'Keyboard', 'price' => 49],
            ['id' => 2, 'name' => 'Mouse', 'price' => 25],
        ]),
    ]);

    Livewire::test(ProductList::class)
        ->call('load')
        ->assertSet('products', fn ($products) => count($products) === 2);
});

it('shows the error state when the catalog request fails', function () {
    Http::fake(['catalog.example.com/products' => Http::response(status: 500)]);

    Livewire::test(ProductList::class)
        ->call('load')
        ->assertSet('hasError', true);
});
```

Prefer typing the faked payload from the real API Resource/DTO the app consumes (a Laravel API Resource class, a form request's validated shape) rather than a hand-written array, for the same reason the JS guides insist on typing MSW fixtures from the real contract — a fake that has drifted from the real response shape greens the test while production breaks.

### Freeze time and test the exact boundary

```php
it('keeps the intervention active 59 minutes after its end', function () {
    $intervention = Intervention::factory()->create(['ends_at' => now()->subMinutes(59)]);

    Carbon::setTestNow(now());

    expect($intervention->fresh()->isActive())->toBeTrue();
});

it('drops the intervention 61 minutes after its end', function () {
    $intervention = Intervention::factory()->create(['ends_at' => now()->subMinutes(61)]);

    expect($intervention->fresh()->isActive())->toBeFalse();
});
```

`Carbon::setTestNow()` is the direct counterpart of `vi.setSystemTime()` — pin it in a `beforeEach()` and call `Carbon::setTestNow()` (no args) in `afterEach()` to release it, so later tests aren't left running on frozen time.

### Permission-gated units (policies / gates)

Same matrix as `AGENTS.md` Step 5.2, driven through Laravel's own authorization primitives instead of a mocked hook:

```php
it('allows an editor to publish a post', function () {
    $editor = User::factory()->create()->assignRole('editor');

    Livewire::actingAs($editor)
        ->test(PostEditor::class, ['post' => $post])
        ->call('publish')
        ->assertHasNoErrors();

    expect($post->fresh()->isPublished())->toBeTrue();
});

it('refuses a viewer publishing a post', function () {
    $viewer = User::factory()->create()->assignRole('viewer');

    Livewire::actingAs($viewer)
        ->test(PostEditor::class, ['post' => $post])
        ->call('publish');

    expect($post->fresh()->isPublished())->toBeFalse();
});

it('returns 403 when the route is hit directly by a viewer', function () {
    $viewer = User::factory()->create()->assignRole('viewer');

    $this->actingAs($viewer)
        ->post("/posts/{$post->id}/publish")
        ->assertForbidden();
});
```

Drive the permission state via `actingAs()` + a real role/policy assignment (or `Gate::define` stub for a narrower unit test) — never assert "does the user have this permission" (that re-tests Laravel's own `Gate`/`Policy` resolution). Assert the **observable outcome**: the model didn't change state, the route returned 403, the button/action is absent from the rendered Livewire component. Cover both the UI-level gate (Livewire component refuses the call) **and** the route-level gate (a direct POST still gets 403) — same "assert every enforcement layer" rule as the JS guides' permission matrix.

### Folio pages

Folio pages are plain Blade views resolved by file path — they test the same way as the Blade component case above, just hit the resolved URL:

```php
// resources/views/pages/products/[product].blade.php resolves to /products/{product}

it('renders the product page with its unique hooks', function () {
    $product = Product::factory()->create();

    $this->get("/products/{$product->id}")
        ->assertOk()
        ->assertSee('data-test-id="product-detail-buy"', false);
});
```

If the Folio page embeds a Livewire component, test the component in isolation with `Livewire::test()` for its logic, and keep the Folio-level test to routing/rendering concerns (does the right page resolve, does it 404 on a missing model, is middleware applied) — don't duplicate the component's own case list at the page level.

### Do not test the framework

Don't write a case asserting that `wire:model` binds an input, that a Blade `@if` renders conditionally, or that Eloquent's `assignRole()` persists a pivot row — those are Livewire's, Blade's, and the framework's own test suites' job. Assert **your** component logic, **your** validation rules, **your** authorization decision.

---

## E2E (Pest Browser plugin or Dusk)

Pest v4's browser plugin uses the global `visit()` helper (Playwright-backed), not `$this->visit()`, and `->type()`/`->click()`/`->press()` rather than `->fill()`:

```php
it('user logs in', function () {
    visit('/login')
        ->type('[data-test-id="login-email-input"]', 'user@example.com')
        ->type('[data-test-id="login-password-input"]', 'secret123')
        ->click('[data-test-id="login-submit"]')
        ->assertUrlIs('/dashboard');
});
```

(Dusk syntax differs — `$browser = $this->browse(fn ($browser) => ...)`, then `$browser->type()`/`->press()`/`->assertPathIs()` — but selects on the same `data-test-*` hooks.)

---

## Table of Contents by Use Case

The Nuxt guide's [use-case catalogue](./README.md#table-of-contents-by-use-case) applies case-for-case; transpose the mounting (`Livewire::test()` instead of `mountSuspended`/`render`) and the interaction layer (`->call()`/`->set()` instead of `user-event`). Cases that prove Laravel/Livewire-specific enough to diverge get their own snippet here — propose them via Issue or PR, same template as the Nuxt guide.
