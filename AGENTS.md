# AGENTS.md — test-casebook testing playbook

> **For an AI coding agent (Claude Code, etc.).** You have been handed this file (or the test-casebook repository) and asked to set up the **test-casebook test-attribute methodology** and write the test suite for a project. This file lives in the test-casebook repo; **apply its steps to the project you are currently working in** (the "target project"), not to test-casebook itself.

`env-attr-cleaner` is a build-time **cleaner**: you write `data-test-*` attributes for testing, they stay in `development`/`test` builds, and they are stripped from `staging`/`production`. The goal of this playbook is: the **same selectors** drive your unit, integration and E2E tests, and never reach users.

## Two parts — cleaner (optional) and testing methodology

This playbook has two separable halves, and they live in **separate repos**:

- **Part A — the cleaner (optional, opt-in).** Steps 1–2 plus the production strip-check in Step 6. Published to npm as **`env-attr-cleaner`** (Bun runtime: **`env-attr-cleaner-bun`**); its per-framework wiring docs live in that repo. **Never install it on your own — ask the user first** (see Step 2). Reference it only by its **published npm package name**, never by a repo path.
- **Part B — the testing methodology.** Steps 3–6 — runners, attributes, the `task-test.md` plan, coverage, verification. Lives here (`test-casebook`) and stands on its own: it does **not** require the cleaner.

Prose docs are split by concern: per-framework **wiring** docs ship with the `env-attr-cleaner` repo; the **testing guide** and conventions ship here (`docs/`). Below they are referenced as **"the docs"** — substitute the real repo / site URLs as they go live. Keep the dependency **one-way**: the methodology knows about the cleaner, never the reverse.

## Definition of done

When you finish, all of these must be true:

1. **If the user opted into the cleaner** (Step 2), it is installed and wired into the target project's build. If they declined, this item and item 6 are N/A.
2. The test runner(s) for the chosen layers are installed and configured.
3. Components expose `data-test-id` / `data-test-class` per the conventions below.
4. A `task-test.md` plan exists, lists every unit and its enumerated cases (see Step 5.0), and **every box in it is ticked, reviewed, and committed** — i.e. tests exist for every layer the project needs (unit, integration, E2E), **cover every branch and state of each unit under test**, are **strictly typed**, **pass**, and each block was validated by a review agent before its commit.
5. Test coverage is **at least 90%** (lines and branches) and the runner is configured to **fail below that threshold** (see Step 6).
6. **If the cleaner was installed,** a production build contains **no** `data-test-*` attributes (verified by grep).
7. Every **permission-gated** unit is covered by a **persona matrix** (Step 5.2) — scenario × persona, expected from the plan, at least one *refused* persona per gated capability, and every enforcement layer asserted — not a single happy-path user.

Work through the steps in order. Do not skip verification.

---

## Step 1 — Detect the stack

Read the target project's `package.json` dependencies and config files, then pick the row:

| If you see… | Framework | Bundler adapter |
|---|---|---|
| `nuxt` | Nuxt | `vite` (inside `nuxt.config` → `vite.plugins`) |
| `vue` + `vite` (no `nuxt`) | Vue | `vite` |
| `react` + `vite` (no `next`) | React | `vite` |
| `next` | Next.js | `webpack` (inside `next.config` → `webpack()`) |
| `svelte` / `@sveltejs/kit` | Svelte / SvelteKit | `vite` |
| `astro` | Astro | `vite` (inside `astro.config` → `vite.plugins`) |
| `bun` runtime build only | Bun | use the **`env-attr-cleaner-bun`** package instead |
| `@angular/core` | Angular | **Not supported — stop.** See the Angular page in the `env-attr-cleaner` repo docs; do not try to wire env-attr-cleaner into an Angular build. |

Match the target project's **package manager** (pnpm / npm / yarn / bun) for every install command below — detect it from the lockfile.

---

## Step 2 — Install and wire the cleaner (ask first)

**Confirmation gate — do not skip.** The cleaner is optional. Before you install or change anything:

1. **Ask the user whether they want to use `env-attr-cleaner` at all.** The testing methodology (Steps 3–6) works without it; the only thing lost without it is the automatic strip of `data-test-*` from production builds (Step 6.4). If they decline, skip the rest of Step 2 and the Step 6 strip-check, and continue with Part B.
2. **Do not run any install command autonomously.** Only install once the user has explicitly confirmed. Never add the dependency, edit the build config, or run `pnpm add` before that confirmation.

Once the user has confirmed, install:

```bash
pnpm add -D env-attr-cleaner     # or npm i -D / yarn add -D
```

Wire it with the adapter from Step 1. The config object is identical everywhere — only the import and the place it goes change:

```ts
envAttrCleaner({
    environments: {
        development: [],
        test: [],
        staging: ['data-test-*', 'data-debug-*'],
        production: ['data-test-*', 'data-debug-*'],
    },
})
```

- **Vite (Vue / React / Svelte):** `import { vite as envAttrCleaner } from 'env-attr-cleaner'` → add `envAttrCleaner({...})` to `plugins` in `vite.config.ts`.
- **Nuxt:** add it to `vite.plugins` in `nuxt.config.ts`.
- **Astro:** add it to `vite.plugins` in `astro.config.ts`.
- **Next.js:** `import { webpack as envAttrCleaner } from 'env-attr-cleaner'` → `webpack(config){ config.plugins.push(envAttrCleaner({...})); return config }` in `next.config.ts`.

The keys map to `NODE_ENV`. The arrays list the patterns to **strip**; every other `data-*` (HTMX, Alpine, ARIA helpers) is preserved. For exact per-framework snippets, read the matching framework page in the `env-attr-cleaner` repo (`docs/frameworks/`).

---

## Step 3 — Install the test runner(s)

Install only the layers the project needs. Use the stack for the detected framework:

| Framework | Unit / Integration | E2E |
|---|---|---|
| React / Next.js | `vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitejs/plugin-react` | `@playwright/test` and/or `cypress` |
| Vue | `vitest @vue/test-utils @vitejs/plugin-vue jsdom` | `@playwright/test` and/or `cypress` |
| Nuxt | `vitest @nuxt/test-utils @vue/test-utils happy-dom` | `@playwright/test` and/or `cypress` |
| Svelte | `vitest @testing-library/svelte @testing-library/user-event @testing-library/jest-dom jsdom` | `@playwright/test` and/or `cypress` |
| Astro | `vitest` (uses Astro's built-in **Container API**, no extra DOM lib) | `@playwright/test` and/or `cypress` |

Then configure the runner:

- **Vitest:** create `vitest.config.ts` with the framework plugin and `test.environment` (`jsdom`/`happy-dom`; for Nuxt use `environment: 'nuxt'` via `defineVitestConfig` from `@nuxt/test-utils/config`; for Astro use `getViteConfig` from `astro/config`).
- **Coverage (every framework — React, Vue, Nuxt, Svelte, Astro):** all of these run on Vitest, so the coverage setup is the same everywhere. Enable it and set a hard **90%** floor so the suite fails below it — install `@vitest/coverage-v8` and add this `test.coverage` block to whichever Vitest config the framework uses above:
  ```ts
  test: {
      coverage: {
          provider: 'v8',
          reporter: ['text', 'html'],
          thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
  }
  ```
  Scope coverage to the source you own (`coverage.include`) and exclude framework / vendor / generated / config files (`coverage.exclude`) so the 90% reflects only the code you wrote — not the framework's own (see Step 5.1).
- **Testing Library** keys `getByTestId` to a single attribute. Set it to `data-test-id` once in a test setup file so the unit/integration snippets below work:
  ```ts
  import { configure } from '@testing-library/dom'
  configure({ testIdAttribute: 'data-test-id' })
  ```
- **Playwright:** `npx playwright init`. **Cypress:** add `cypress.config.ts`. Point both at a `development`/`test` build URL.

---

## Step 4 — Attribute conventions

Add hooks to components as you write tests. Two attributes, two jobs:

- **`data-test-id`** → one **unique** element. Selected with `getByTestId` (or `[data-test-id="..."]`).
- **`data-test-class`** → a **group** of elements of the same role. Selected with a list query / count (there is **no** `getByTestClass`).

Rules:

- Name by **role**, never by style, color, or DOM position: `login-submit`, `product-card` — not `blue-btn`, `first-div`.
- Put the attribute directly in the markup/JSX. env-attr-cleaner strips it in `staging`/`production`, so it costs nothing in shipped output. **Static, dynamic (`={...}`), bound (`:data-test-id`), unquoted and value-less forms are all stripped** — use whichever the component needs.
- **Never** branch runtime logic on these attributes (absent in production). They are test/debug metadata only.
- **Never** select tests on CSS classes, tag structure, or visible text. Select on `data-test-*`.

---

## Step 5 — Write the tests

Cover three layers. **Unit** = one component in isolation. **Integration** = several components / a full view together. **E2E** = the real app in a browser. Always cover **both** selection styles — `data-test-id` (single) and `data-test-class` (group).

### Step 5.0 — Plan in `task-test.md` first, then execute block by block (mandatory)

The snippets below are **happy-path examples, not a target**. A test file that only re-implements them is a failed task. Do **not** start writing tests by hand from a guess. Work in two passes — **plan, then execute** — so coverage is explicit and checkable instead of held in your head.

#### Pass A — Build the plan (`task-test.md`)

Create a `task-test.md` at the target project root. It is the single source of truth for what must be tested. Fill it like this:

1. **List every unit under test** — each component / view / composable / function that needs a test, grouped into one **block per unit**. **Include units that already have tests** — existing tests are a starting point, not a reason to skip the unit (see "Existing tests" below).
2. For each block, **read that unit's full source end to end** — every line of the function/SFC, plus the hooks, composables, helpers, and child components it calls. Do not plan from the name, the props list, or a guess; open the file and follow each path.
3. From what you actually read, **enumerate every case as a checkbox** under that block:
   - **every prop** — required vs optional, each meaningful value, defaults, and the `undefined`/`null` case;
   - **every conditional render** — each branch of every `if` / ternary / `&&` / `v-if` / `switch` / early return, including the "renders nothing" branch;
   - **every state** — loading, empty, populated, success, **error**, and disabled/readonly;
   - **every user interaction and event** — click, type, submit, blur, keyboard, plus the handler's success **and** failure outcomes;
   - **every boundary and edge case** — empty list, single item, many items, max/min length, zero, negative, very long text, special characters, async race / double-submit;
   - **every guard the code already contains** — if the source checks for something (a null, a length, a permission), list both sides of that check.
   - **every authorization gate** — if the unit reads a role, permission, or ownership / scope check (renders, enables, or hides on it, or calls a gated action), one user is not enough: it needs a **persona matrix** (Step 5.2), with at least one persona that is *refused*.

   Enumerate **only your unit's own logic** — do not list cases that merely re-test framework or third-party behaviour (see Step 5.1).
4. Note, per block, the **layer** (unit / integration / E2E) and the **`data-test-*` hooks** each case will select on.

Example shape:

```md
## src/components/LoginForm.vue  — unit + integration
- [ ] renders the unique hooks (data-test-id: login-email, login-submit)
- [ ] groups inputs by role (data-test-class: form-input ×2)
- [ ] submit with valid input → emits success / navigates to dashboard
- [ ] submit with invalid email → shows error state, no navigation
- [ ] submit while pending → button disabled, no double-submit
- [ ] server error → error message rendered, form stays editable
- [ ] optional `prefill` prop undefined → fields empty
```

**Existing tests — audit, don't trust.** A unit that already has a test file is **not** done. For each such unit, after reading its source and enumerating the cases above, **read its existing test file too** and reconcile it against your case list:
- a case the existing test already covers **well** (real assertion, `data-test-*` selector, strict typing) → tick it as already-covered and note the file;
- a case that is **missing** → leave it unchecked, to be written in Pass B;
- an existing test that is **weak** (only happy path, asserts on text/CSS/structure instead of `data-test-*`, uses `any`/untyped fixtures, or doesn't really fail when behaviour breaks) → add a checkbox to **fix/retype/rewrite** it, not just to leave it.

So the plan covers both green-field units and the backfill/repair of already-written tests. Old tests get migrated to `data-test-*` selectors and strict typing as part of this — they are held to the exact same bar as new ones.

#### Pass B — Execute each block

Work through `task-test.md` **one block at a time**. For each block (ideally hand the block off to a dedicated sub-agent so it stays focused on that one unit):

1. **Write one assertion-bearing test per checkbox.** Every case in the block must map to at least one test; a checkbox with no test is an incomplete task, not a stylistic choice. If a path is genuinely unreachable, leave a one-line comment saying why instead of silently dropping it.
2. **Add the `data-test-*` hooks** each case needs to the component as you go, rather than reaching for text or CSS to cover an awkward case.
3. **Type the test fully — no `any`.** In a TypeScript project the test file and everything in it must be typed as strictly as the production code:
   - import and use the component's **real prop / fixture types** (`ComponentProps<typeof X>`, the exported interfaces) — never retype props inline or with `any`;
   - type every **fixture, factory, and sample object** to its domain type so a shape change breaks the test at compile time;
   - type **mocks and spies** to the signature they replace (`vi.fn<Args, Return>()` / `MockedFunction<typeof fn>`, `vi.mocked(...)`), and type mocked module returns to the real return type;
   - keep query results at their **narrow DOM type** (`HTMLInputElement` etc.) instead of widening, so `.value`/attributes are checked;
   - if a type is genuinely unknowable, use `unknown` + a narrowing assertion, **never `any`** or a blind `as`.
   The test file must pass the project's type-check / lint with zero new errors or suppressions.
4. **Run the block's tests; they must pass.** Then **tick the checkbox** in `task-test.md`.
5. **Review before committing — hand the block to a dedicated review agent.** Once the block's boxes are ticked and its tests are green, a separate review agent (not the one that wrote the tests) validates the block against this playbook before anything is committed. It checks that:
   - every case listed for the block in `task-test.md` has a real, assertion-bearing test (no ticked-but-missing, no empty/placeholder tests, no `expect(true)`);
   - selectors are `data-test-*` only — no class/text/structure selectors slipped in;
   - typing is strict per Pass B step 3 — no `any`, no untyped fixtures/mocks, no blind `as`, and the type-check / lint is clean;
   - the tests assert behaviour, not implementation details, and actually fail when the behaviour is broken (sanity-check at least one);
   - no full-DOM snapshot is standing in for real assertions, and tests don't touch the real network/clock/shared state (MSW, seeded stores, fake timers — see Step 5.1).

   If the reviewer flags anything, fix it and re-review — **do not commit a block the reviewer rejected.**
6. **Commit the block only when the reviewer approves and the tests are green.** One focused commit per block (the new/changed test file, the `data-test-*` hooks added to the component, and the ticked `task-test.md`). Then move to the next block.

The task is done only when every box in `task-test.md` is ticked, reviewed, and committed. Use the same discipline for plain functions/composables: read the whole function, list every input partition and every return/throw path, give each a checkbox, and cover each.

### Step 5.1 — Isolate the unit, stay deterministic, don't test the framework

These three rules apply to every test you write or repair.

**Isolate the unit from its collaborators.** A unit test must fail only when the unit itself breaks — never because of the network, a store, the router, or a heavy child. Replace those at the boundary:
- **Network / HTTP** — never hit a real endpoint. Intercept with **MSW** (`msw`) and return typed fixtures; cover the success, empty, and error-status branches by swapping handlers per test. **Type those fixtures from the real API contract** (the backend's response schema / resource definition), never from a hand-written guess — derive the fixture type from the **same types the production code consumes**, so a mock of an endpoint or method that no longer exists, or a response shape that has drifted, fails at type-check. A lying mock is worse than no mock: it greens the test while production breaks.
- **Stores (Pinia / Zustand / Redux)** — mount with a fresh, seeded test store (`createTestingPinia()`, a wrapped provider) so each test starts from a known state; never share state across tests.
- **Router / i18n / theme** — provide them through the framework's test utilities (Vue `global.plugins`, a React provider wrapper, `@nuxt/test-utils`) with a minimal config, not the real app bootstrap.
- **Heavy or out-of-scope children** — stub them to a placeholder that still carries the `data-test-*` hook you assert on, so the test stays about this unit. At **integration** level, render the real children instead.

Type every stub / handler to the real signature (Pass B step 3) — a stub that has drifted from the real shape is worse than no stub. For **critical flows** (auth, permission gates, data mutations), don't rely on mocked unit tests alone — exercise at least one real path end-to-end in E2E against a running stack, so a lying mock can never hide the whole flow.

**Keep every test deterministic.** Same result on every machine, every run:
- freeze time — `vi.useFakeTimers()` with a fixed date; advance with `vi.advanceTimersByTime` / `await vi.runAllTimersAsync()` instead of real waits;
- pin **timezone and locale** (e.g. `TZ=UTC`, a fixed `Intl` locale) so date / number / format assertions don't shift between machines;
- never rely on unseeded `Math.random`, real `Date.now()`, real timers, network latency, or test execution order;
- await the DOM — `findBy*` / `waitFor` / `await flushPromises()` before asserting on async updates; never assert on a render that hasn't settled.

**Don't test the framework — test your code.** Coverage and cases are about *your* logic, not the library's:
- do **not** write cases that assert a framework / library feature works (that `v-if` toggles, that the router navigates, that a third-party UI component renders its own markup) — that is the framework's own test suite's job;
- treat third-party components and the framework runtime as trusted boundaries — assert on **your** inputs to them and **your** handling of their outputs, not their internals;
- exclude framework / vendor / generated code from coverage (`coverage.exclude`) so the 90% measures only the code you wrote.

**Some effects aren't observable at unit level — send them to E2E, don't fake them.** A headless DOM (jsdom / happy-dom) does not compute layout or fully apply styling: CSS custom properties injected via `v-bind()` / `useCssVars`, values from real stylesheets, geometry, and paint are not serialized. If a case's only observable effect is one of these (e.g. a `fontSize` prop that just feeds a CSS variable), it **cannot** be asserted in a unit test. Do not select on a rendered style that the runner never produced, and do not invent a passing assertion. Cover the prop's *render* branches at unit level, assert the visual effect in **E2E**, and leave a one-line note on the skipped unit assertion per Step 5.0 — the same honesty rule as a genuinely unreachable path.

### Step 5.2 — Permission-gated units: the persona matrix

When a unit's behaviour depends on **who** the current user is — a role, a permission, an ownership / tenant / scope check — one happy-path user is not a test. This is the single biggest source of escaped bugs, because a harness that always authenticates as the same user (or only ever mints single-role users) never exercises the other actors. Apply this whenever Step 5.0 flagged an authorization gate.

**Personas live in one shared catalogue.** Declare them once, declaratively — each persona is a **named actor** with its role / permission assignments, scoped as the target project's model requires (global, per-tenant / organisation, or per-resource-owner). Both the unit / integration tests and the E2E suite read personas from this **same** catalogue, so front and back assert the *same* actors. When both sides drive the same persona through the same scenario and disagree, the divergence is the bug.

**Mint each persona fresh; never mutate one user on the fly.** Seed / create the persona and authenticate as it (a fresh token) per test. Mutating a single user's rights mid-run tests a state the app never really is in, leaks state across tests, and — if rights are baked into the token at login — silently keeps the old permissions, greening a broken case. Fresh persona = the real "logs in with role set X" path, and deterministic.

**Build a matrix, not a list.** For each **scenario** the unit exposes × each **persona**, state the expected outcome. The permission is the *input* that sets the expected result; you assert the **observable outcome** — element present / absent, action succeeds / is refused — never "does this user hold permission Y" (that just re-tests the framework's gate).

- **The expected outcome comes from the plan / human intent, not from the app's own check.** Computing "expected = what `can()` returns" and then asserting against `can()` is circular: if the gate is wrong, the expectation is wrong too, and the test greens over the bug. The `task-test.md` case says what *should* happen; the test verifies the system against that.
- **Weight the matrix on the refused cells.** "This persona can" is the easy half; the bugs live in "this persona must **not**, and is actually prevented." For every gated capability, test at least one persona that is denied.
- **Assert every layer that enforces.** If a server *and* a client both guard the same capability, assert both: the API refuses (e.g. 403) **and** the UI reflects it (the gated element is absent / disabled — assert its absence via the `data-test-*` hook). A UI that hides a button while the API still allows the call is a security bug this matrix exists to catch — and so is the reverse.
- **Aggregation across several roles needs unit coverage.** An E2E harness that only mints single-role users will never surface a bug in how rights *combine* across roles. Add a unit test built on an actor carrying the permission on a **non-primary** role, so an aggregation regression fails at the unit level.

**Prerequisite — you must be able to *become* each persona.** This chapter needs the persona catalogue **and** a way to instantiate each one (a factory / token minter). If that capability does not exist in the target project, **say so and stop** — do not write a green test you cannot actually drive as the intended persona, and do not silently fall back to the default user. A matrix run as one user is the very hole this step closes.

### Unit + integration (React / Next.js shown; adapt the render API per framework)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
    it('exposes the unique hooks (data-test-id)', () => {
        render(<LoginForm />)
        expect(screen.getByTestId('login-email')).toBeInTheDocument()
        expect(screen.getByTestId('login-submit')).toBeInTheDocument()
    })

    it('groups inputs by role (data-test-class)', () => {
        const { container } = render(<LoginForm />)
        expect(container.querySelectorAll('[data-test-class="form-input"]')).toHaveLength(2)
    })

    it('runs the flow (integration)', async () => {
        const user = userEvent.setup()
        render(<LoginPage />)
        await user.type(screen.getByTestId('login-email'), 'user@example.com')
        await user.click(screen.getByTestId('login-submit'))
        expect(await screen.findByTestId('dashboard')).toBeInTheDocument()
    })
})
```

The block above is the *shape*; the example below is the **bar** — one unit, every state covered, network mocked, fixtures typed, DOM awaited. A real `task-test.md` block looks like this, not like the three-test snippet above:

```tsx
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ProductList } from './ProductList'
import type { Product } from '@/types/product'

const sample: Product[] = [
    { id: '1', name: 'Keyboard', price: 49 },
    { id: '2', name: 'Mouse', price: 25 },
]

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ProductList', () => {
    it('shows the loading hook before the request resolves', () => {
        server.use(http.get('/api/products', () => HttpResponse.json(sample)))
        render(<ProductList />)
        expect(screen.getByTestId('products-loading')).toBeInTheDocument()
    })

    it('renders one card per product (populated, data-test-class)', async () => {
        server.use(http.get('/api/products', () => HttpResponse.json(sample)))
        const { container } = render(<ProductList />)
        await screen.findByTestId('products-ready')
        expect(container.querySelectorAll('[data-test-class="product-card"]')).toHaveLength(2)
    })

    it('shows the empty state when the list is empty', async () => {
        server.use(http.get('/api/products', () => HttpResponse.json([])))
        render(<ProductList />)
        expect(await screen.findByTestId('products-empty')).toBeInTheDocument()
    })

    it('shows the error state when the request fails', async () => {
        server.use(http.get('/api/products', () => new HttpResponse(null, { status: 500 })))
        render(<ProductList />)
        expect(await screen.findByTestId('products-error')).toBeInTheDocument()
    })
})
```

Note the discipline: typed fixture (`Product[]`), MSW swapped per test to drive each branch, `await findBy*` before asserting, both selector styles, and **every state** (loading / populated / empty / error) — not just the happy path. For a debounced/timed unit, pair this with `vi.useFakeTimers()` and a fixed date (Step 5.1).

Per-framework equivalents for the render/query API:
- **Vue / Nuxt:** `mount(Component)` / `mountSuspended(Component)`; `wrapper.find('[data-test-id="..."]')`, `wrapper.findAll('[data-test-class="..."]')`, `.setValue()`, `.trigger('submit')`.
- **Svelte:** `render(Component)` from `@testing-library/svelte`; same `screen.getByTestId` + `container.querySelectorAll('[data-test-class="..."]')`.
- **Astro:** `await AstroContainer.create()` then `renderToString(Component)`; assert with `html.includes('data-test-id="..."')` and count `data-test-class` occurrences. (Interactive flows live in client islands → cover them in E2E.)

### E2E (Playwright shown; Cypress is the same selectors)

```ts
import { test, expect } from '@playwright/test'

test('user logs in', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-test-id="login-email"]').fill('user@example.com')
    await page.locator('[data-test-id="login-submit"]').click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-test-class="form-input"]')).toHaveCount(2)
})
```

For deeper scenario snippets (forms, tables, modals, auth, i18n, state…), read the testing guide in `docs/testing-guide/`.

---

## Step 6 — Verify (do not skip)

1. **Run the tests** with the project's commands; they must pass. Unit/integration run under `NODE_ENV=test`, where attributes are present.
2. **Run coverage and enforce the 90% floor:**
   ```bash
   pnpm vitest run --coverage      # or the project's coverage script
   # must report ≥ 90% lines & branches and exit 0 (thresholds fail the run otherwise)
   ```
   If coverage is below 90%, read the coverage report, find the uncovered lines/branches, and **go back to Step 5.0** — they map to cases missing from `task-test.md`. Add those cases and their tests; do not lower the threshold to pass.
3. **Run E2E** against a `development`/`test` build (attributes present).
4. **Build for production and confirm the strip:**
   ```bash
   pnpm build
   grep -r "data-test" <output-dir>     # dist/ · .next/static · .output/public
   # must return nothing
   ```

If the grep finds anything, the cleaner is not wired correctly — recheck Step 2 (right adapter, `enforce: 'pre'`, correct `NODE_ENV`).

---

## Guardrails

- Do **not** install or wire the cleaner without the user's explicit confirmation, and warn them its package / URL is moving to a new repo (see Step 2). The methodology (Part B) runs without it.
- Do **not** invent a new attribute scheme; use `data-test-id` / `data-test-class`.
- Do **not** weaken tests to pass (no class/text/structure selectors).
- Do **not** stop at the happy path. The Step 5 examples are a starting point; ship tests only after the unit's source has been read and every box in the `task-test.md` plan (Step 5.0) has a passing test.
- Do **not** skip the `task-test.md` plan and write tests straight from a guess — the plan, built from reading the source, is what makes coverage exhaustive instead of basic.
- Do **not** ship loosely-typed tests. No `any`, no untyped fixtures/mocks, no blind `as`; reuse the production types and let the test file pass the project's type-check (see Step 5.0 Pass B).
- Do **not** leave pre-existing tests untouched. A unit that already had tests is held to the same bar — audit each one against the case list, migrate it to `data-test-*` selectors and strict typing, and backfill every missing case (see Step 5.0 "Existing tests").
- Do **not** lower or disable the 90% coverage threshold to make the suite pass. Below 90% means cases are missing — add the tests, don't move the bar.
- Do **not** test the framework or third-party libraries — they test themselves. Cover your own logic only, treat libraries as trusted boundaries, and exclude vendor/framework code from coverage (see Step 5.1).
- Do **not** let tests touch the real network, clock, or shared state. Mock the network (MSW), seed stores, freeze time, and pin timezone/locale so tests are isolated and deterministic (see Step 5.1).
- Do **not** trust a mock that has drifted from reality. Type fixtures from the real API contract so a mock of a non-existent method / endpoint, or a wrong response shape, fails at type-check — a lying mock greens the test while production breaks (see Step 5.1).
- Do **not** test a permission-gated unit with a single user. Build the persona matrix (Step 5.2): scenario × persona, dense on the *refused* cells, asserting every enforcement layer. A single happy-path user is the biggest source of escaped permission bugs.
- Do **not** compute a case's expected result from the app's own permission check and assert against it — that is circular and greens over a broken gate. The expected outcome comes from the plan / human intent.
- Do **not** simulate personas by mutating one user's rights on the fly, and do **not** fall back to the default user when a persona can't be minted — mint each persona fresh and authenticate as it, or stop and flag the missing capability (see Step 5.2).
- Do **not** use full-DOM snapshot tests as a substitute for assertions. A `toMatchSnapshot()` over rendered markup asserts nothing meaningful, inflates coverage, and gets regenerated blindly with `-u` on every change. Assert on explicit `data-test-*` hooks and behaviour instead. (A tiny, intentional inline snapshot of one serialized value is fine; a whole-component snapshot standing in for real cases is not.)
- Do **not** remove or rename other `data-*` attributes.
- Do **not** attempt Angular — env-attr-cleaner cannot strip its templates (see the Angular page in the `env-attr-cleaner` repo docs).
- Keep the cleaner config's `staging`/`production` arrays in sync with any extra patterns you introduce (e.g. `data-debug-*`).
