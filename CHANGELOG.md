# Changelog

## 1.0.10

- **README — warmer Contributing section.** Reframed from a bug-report checklist to an explicit invitation: contributions are welcome, no permission or big change needed, small fixes count. Added a fifth idea (share a worked example, pointing at the Laravel permission-matrix example as the template) and closed with "don't let an imperfect PR stop you from opening it."

## 1.0.9

- **README — Contributing section.** Points contributors at the concrete gaps worth a PR (missing dedicated guides for Vue/Svelte/Astro/Bun, drifted API snippets, scaffolder/hook bugs) and sets the bar: verify against the real tool, don't guess — referencing the earlier Pest v4 browser plugin fix as the example of what that looks like.

## 1.0.8

- **Laravel guide — worked example (roles + a private article).** New "Worked example" section in `docs/testing-guide/laravel.md`: a blog with four permission states (admin / author / authenticated non-author / guest) and a private-article scenario, policy shared between route middleware and the listing's own filter, and a full `task-test.md` block (28 cases) dense on the refused cells per Step 5.2 — including the non-primary-role case (admin editing an article it doesn't own) and both enforcement layers (Livewire action + HTTP route) for the refused save. Verified for real: built and run against a real Laravel + Livewire + Pest project in Docker, 28/28 green, 51 assertions. Also documents a real gotcha hit while building it — a route pointing straight at a Livewire component needs `resources/views/layouts/app.blade.php` or every route throws "No hint path defined for [layouts]".

## 1.0.7

- **Coverage floor lowered to 80% (was 90%), and made configurable.** `npx test-casebook init --coverage=<1-100>` now rewrites every threshold occurrence (Vitest config blocks, Pest `--min=` flag, prose) in the scaffolded `AGENTS.md` and `docs/testing-guide/*.md` to the requested number in one pass, instead of leaving teams to hand-edit a hardcoded 90 across a dozen places. Omit the flag to keep the 80% default. `AGENTS.md` gained a "Coverage floor" section documenting the mechanism, including the by-hand fallback for when the playbook is pasted directly into an agent instead of scaffolded.
- **PHPStan / Larastan as the PHP static-analysis gate.** The Laravel guide, `AGENTS.md` Step 3, and both `test-writer`/`test-reviewer` agents now name Larastan (PHPStan at `level: 8`) as the explicit counterpart to `tsc`/ESLint's strict-typing gate — a PHPStan error is treated exactly like a failing type-check (fix the type, never baseline-ignore).
- **Plain PHPUnit test classes need no migration.** Documented in the Laravel guide and `AGENTS.md`: Pest runs on top of PHPUnit, so an existing `extends TestCase` suite keeps working as-is: the doctrine (selectors, plan, permission matrix, no comments) applies identically, Pest is additive.
- **Fix — Pest v4 browser plugin syntax.** The Laravel guide's E2E snippet used an invented `$this->visit()->fill()` API; corrected to the real `visit()` global helper with `->type()`/`->click()`/`->press()`, verified against the pestphp/pest-plugin-browser docs.

## 1.0.6

- **Laravel / Livewire / Blade / Folio support.** New Phase 3 guide (`docs/testing-guide/laravel.md`) covers Pest + `pest-plugin-laravel` + `pest-plugin-livewire` setup, `RefreshDatabase` as the fresh-store equivalent, `Livewire::test()` for component logic, `Http::fake()` typed from real API Resources/DTOs as the MSW counterpart, `Carbon::setTestNow()` for frozen-time boundary tests, the permission matrix driven through real policies/gates (`actingAs()` + route-level 403 assertions), and Folio page tests. `AGENTS.md` Step 1 now detects `laravel/framework` in `composer.json` and routes straight to Part B (no bundler, so the cleaner/Part A does not apply — server-rendered Blade has no build pipeline to strip attributes from; use a `@testattr` Blade directive gated on environment instead). Step 3 documents that PHP/Blade has no static-analysis equivalent of the JS selector-lint gate, so the rule is enforced at `test-reviewer` review time instead.

## 1.0.5

- **Installer — root pointers.** `npx test-casebook init` now walks up to the git root and drops (or appends to) `CLAUDE.md` — plus `AGENTS.md` when scaffolding into a subproject — a short pointer to the scaffolded playbook with the non-negotiables (data-test-* selectors only, `task-test.md` plan, isolated seeded store, strict typing, 90% floor) and the routing rule: test writing always goes through the `test-casebook` skill and its `test-writer` / `test-reviewer` sub-agents, never directly. Fixes the doctrine being invisible to any agent launched at the repository root of a monorepo (observed on a React + .NET solution: the playbook lived in the client subfolder and every test MR ignored it). Idempotent: existing pointers are skipped, existing files are appended once.
- **Plan gate hook (Claude Code).** The kit now ships `.claude/hooks/test-casebook-gate.mjs` plus a `PreToolUse` entry in `.claude/settings.json`: any `Write`/`Edit` on a `*.test.*` / `*.spec.*` file is denied while no `task-test.md` plan exists above it, with a message steering the session into the `test-casebook` skill. `init` installs both at the subproject and at the git root (root `settings.json` left untouched if it already exists — the hook entry to add is printed instead).
- **Doctrine (Step 3) — selector lint gate.** The selector rule is now enforced mechanically: a test-file ESLint override bans text/role/structure queries (`getByText`, `getByRole`, `querySelector`, `closest`, `toHaveClass`, …) and a `no-restricted-imports` entry keeps the app's real singleton store out of tests. Group selection goes through a shared `getAllByTestClass` test-utils helper, outside the override's scope. Step 6 runs lint alongside the tests; the `test-casebook` skill treats the infra as unfinished until a forbidden selector fails lint.
- **Docs — React + Vitest guide.** `docs/testing-guide/react.md` opens Phase 2: RTL setup with `testIdAttribute`, the `renderWithProviders` fresh-store helper, `getAllByTestClass`, typed MSW fixtures, boundary testing with fake timers, state-not-classes variant assertions, and the don't-test-the-framework rule — each snippet distilled from a real doctrine violation observed in the pilot's MRs.

## 1.0.4

- **Docs scrubbed of comments.** Every code example in `docs/` (testing-guide, conventions, strategy) is now comment-free, so the examples model the no-comments rule instead of contradicting it. Explanations that lived in `// ...` notes (teleport gotchas, the triple-await, the fragile-vs-stable selector contrast, per-environment cleaner config) moved into surrounding prose — no information lost.

## 1.0.3

- **Doctrine — no comments in test code.** New Guardrail and matching rules in `test-writer` / `test-reviewer`: test files (and any component hooks added) carry **zero** comments — no `// arrange / act / assert`, no section banners, no explanatory notes. Intent lives in `describe` / `it` / test and variable names; a test that needs a comment to be understood is renamed or split. Reasons for skipping an unreachable case go in `task-test.md`, not in the code. The reviewer rejects any comment; existing comments are stripped when repairing tests.

## 1.0.2

- **Doctrine (Step 5.2)** — the *persona matrix* is now the **permission matrix**. Permission-gated units are tested by driving the **permission state** directly (the gate boolean / permission list the code reads) rather than by minting distinct user personas: in unit / integration you mock the gate input, in E2E you may use real users. The blocking "persona catalogue / token minter" prerequisite is dropped — if you cannot drive the permission state at all, flag it, otherwise test the states you can drive. The matrix (not a list), refused-cell weighting, every-enforcement-layer assertions, and multi-role aggregation coverage are unchanged.

## 1.0.1

- **`test-task` skill** reworked for the project-manager flow: a story becomes **one Jira sub-task per team** (front / back / mobile), label = team, assignee = developer, carrying behavioural intent only (no stack code). Each team executes its own sub-task with `test-casebook`.
- **Doctrine (Step 5.1)** — props whose only effect is a CSS variable (`v-bind` / `useCssVars`) aren't observable in a headless DOM: assert them in E2E and document the skipped unit assertion, never fake one.

## 1.0.0

Initial public release.

- **`AGENTS.md`** — the test-casebook testing playbook: plan (`task-test.md`) → execute block by block → review gate → verify, with the permission matrix for permission-gated units and the anti-mock-drift rules.
- **Claude Code skills** — `test-task` (project manager: story → shared `test-task.md`) and `test-casebook` (developer: per-unit test execution), plus the `test-writer` / `test-reviewer` sub-agents.
- **`npx test-casebook init`** — scaffolds `AGENTS.md`, `docs/` and `.claude/` into any project.
- **Docs** — strategy, `data-test-*` conventions, testing guide.

Pairs with [`env-attr-cleaner`](https://github.com/techmefr/env-attr-cleaner) (one-way dependency).
