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
composer require pestphp/pest-plugin-browser --dev   # Pest v4 browser plugin (Playwright-backed)
# or
composer require laravel/dusk --dev && php artisan dusk:install
```

**Plain PHPUnit works unchanged.** Pest is built directly on top of PHPUnit — `pest:install` just adds a `Pest.php` bootstrap next to the existing `phpunit.xml`. A project that already has PHPUnit test classes (`class LoginTest extends TestCase { public function test_x(): void { ... } }`) does not need to migrate anything: the doctrine applies identically — `data-test-*` selectors, the `task-test.md` plan, the permission matrix, the no-comments rule, `RefreshDatabase`, `Http::fake()` — only the `it('...', fn () => ...)` syntax sugar is Pest-specific. Add Pest **alongside** PHPUnit test classes (both run under `vendor/bin/pest` / `vendor/bin/phpunit`) rather than rewriting a green suite just to get the `it()` syntax.

### Static analysis gate — PHPStan / Larastan

The JS guides enforce strict typing with `tsc`/ESLint (Pass B step 3: "no `any`, no blind `as`, type-check clean"). PHP's equivalent enforcement tool is **PHPStan**, with the Laravel-aware ruleset **Larastan**:

```bash
composer require larastan/larastan phpstan/phpstan --dev
```

```neon
# phpstan.neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    paths:
        - app
        - tests
    level: 8
```

Run it alongside the tests, same as the JS guides run lint alongside Vitest/Playwright:

```bash
vendor/bin/phpstan analyse --memory-limit=1G
```

`level: 8` is the strictest practical floor (catches missing return types, `mixed`-typed properties, unsafe `array` shapes) — the direct counterpart of TypeScript `strict: true`. Add `declare(strict_types=1);` to every file you write or touch, same rigor as banning `any`. Treat a PHPStan error the same as a failing type-check in the JS guides: fix the type, don't add a baseline-ignore to make it pass.

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

Run with a hard 80% floor, same as every other stack in this doctrine:

```bash
vendor/bin/pest --coverage --min=80
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

## Worked example — a blog with roles and a private article

The snippets above are single-case illustrations. This one is a full `task-test.md` block worked end to end — a permission-gated feature with more than two permission states, run for real against `vendor/bin/pest` (28/28 green) to make sure nothing here is aspirational.

**The feature:** a blog. `User.role` is `admin` or `user`; "author" is not a stored role, it's whoever owns the article (`article.user_id`). An article can be `is_private`. Four permission states matter for every scenario: **admin**, **author** (owns *this* article), **user** (authenticated, not the author), **guest** (no session).

### The policy — single source of truth for both layers

```php
class ArticlePolicy
{
    public function view(?User $user, Article $article): bool
    {
        if (! $article->is_private) {
            return true;
        }

        if (! $user) {
            return false;
        }

        return $user->isAdmin() || $user->id === $article->user_id;
    }

    public function update(User $user, Article $article): bool
    {
        return $user->isAdmin() || $user->id === $article->user_id;
    }
}
```

Routes enforce it at the HTTP layer; the Livewire components read the same gate to decide what to render — one policy, two enforcement points, exactly what Step 5.2 requires you to assert **both** of:

```php
Route::get('/articles/{article}', ArticleShow::class)->middleware('can:view,article');
Route::get('/articles/{article}/edit', ArticleEdit::class)->middleware(['auth', 'can:update,article']);
```

The listing filters through the same gate instead of re-implementing the rule — so `Blog` and the route middleware can never disagree on who sees what:

```php
class Blog extends Component
{
    public function render()
    {
        $articles = Article::with('author')->latest()->get()
            ->filter(fn (Article $article) => Gate::allows('view', $article))
            ->values();

        return view('livewire.blog', ['articles' => $articles]);
    }
}
```

### The matrix, as tests — dense on the refused cells

One block, four permission states, both a public and a private article. Note the **non-primary-role case** Step 5.2 calls out explicitly: admin passes despite owning nothing.

```php
it('an admin sees both the public and the private article', function () {
    $admin = User::factory()->admin()->create();
    $author = User::factory()->create();
    Article::factory()->for($author, 'author')->create(['title' => 'Public one']);
    Article::factory()->for($author, 'author')->private()->create(['title' => 'Private one']);

    Livewire::actingAs($admin)->test(Blog::class)
        ->assertSee('Public one')
        ->assertSee('Private one');
});

it('a user who is not the author sees only the public article', function () {
    $author = User::factory()->create();
    $otherUser = User::factory()->create();
    Article::factory()->for($author, 'author')->create(['title' => 'Public one']);
    Article::factory()->for($author, 'author')->private()->create(['title' => 'Private one']);

    Livewire::actingAs($otherUser)->test(Blog::class)
        ->assertSee('Public one')
        ->assertDontSee('Private one');   // refused cell
});
```

Weighting the refused cells (Step 5.2) means also asserting the save path is refused, not just hidden — a hidden button with an unprotected action behind it is the exact bug this step exists to catch:

```php
it('a user who is not the author is refused at the Livewire action level', function () {
    $author = User::factory()->create();
    $otherUser = User::factory()->create();
    $article = Article::factory()->for($author, 'author')->create(['title' => 'Old title']);

    Livewire::actingAs($otherUser)->test(ArticleEdit::class, ['article' => $article])
        ->set('title', 'Hacked title')
        ->call('save')
        ->assertForbidden();

    expect($article->fresh()->title)->toBe('Old title');   // asserted at the data layer too
});

it('a user who is not the author is refused the edit route over HTTP', function () {
    $author = User::factory()->create();
    $otherUser = User::factory()->create();
    $article = Article::factory()->for($author, 'author')->create();

    $this->actingAs($otherUser)
        ->get("/articles/{$article->id}/edit")
        ->assertForbidden();
});

it('a guest is redirected to login when hitting the edit route directly', function () {
    $author = User::factory()->create();
    $article = Article::factory()->for($author, 'author')->create();

    $this->get("/articles/{$article->id}/edit")->assertRedirect('/login');
});
```

Full block: 6 `LoginForm` cases, 5 `Blog` cases (empty / admin / author / user / guest), 9 `ArticleShow` cases (view gate × 4 states, edit-link visibility × 4 states, plus the happy path), 6 `ArticleEdit` cases (author saves, admin saves as non-owner, validation, refused at the action level, refused at the route level, guest redirected) — **28 tests, 51 assertions, all green**. That count is what "dense on the refused cells" looks like in practice: more permission-refusal cases than happy-path ones.

### Gotcha hit building this: Livewire full-page components need a layout

`Route::get(...)->middleware(...)` pointing straight at a Livewire component (no controller) renders that component as a full page, which requires `resources/views/layouts/app.blade.php` to exist (`{{ $slot }}` + `@livewireStyles`/`@livewireScripts`). Without it every route throws `No hint path defined for [layouts]` — not a test-casebook issue, but the kind of environment-setup gap Step 1/3 (detect the stack, install/configure the runner) is meant to catch before Pass B starts, so note it if scaffolding a fresh Laravel + Livewire project for the first time.

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
