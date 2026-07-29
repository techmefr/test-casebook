# Changelog

## 0.2.0

- **Second worked example: AdonisJS 6** (`create-adonisjs --kit=api`), same blog-idea scenario as the NestJS example — roles (admin/author/member), a private article, scheduled publishing, comments with an owner notification. **39/39 tests green (9 unit + 30 functional), `tsc --noEmit` clean, ESLint clean, 100% line coverage** on every file the scenario touches (policies, controllers, services, listeners, events, validators). See [`docs/testing-guide/adonisjs.md`](docs/testing-guide/adonisjs.md).
- **Confirmed AdonisJS's real test runner is Japa (`@japa/runner`), not Jest or Vitest** — added as an explicit detection row in `AGENTS.md`'s stack table; a doctrine that only checks for `jest`/`vitest` would misdetect the runner on every Adonis project.
- Found and documented three real, non-obvious integration bugs surfaced by actually running the suite:
  - **Japa's request-builder assertion methods (`.assertStatus()`, etc.) only exist on the resolved response**, not the pending request builder — unlike supertest's fully chainable API. Every functional test awaits the request into a variable first.
  - **`HOST=localhost` binds the test server on IPv6 while Japa's API client defaults to IPv4**, producing `ECONNREFUSED` on every functional test despite the server genuinely starting — fixed via `HOST=127.0.0.1` in `.env.test`.
  - **Overriding Luxon's `Settings.now` with a closure that itself calls a Luxon API (`DateTime.fromISO`) recurses infinitely** — fixed by computing the frozen timestamp with a plain `Date` outside the override closure.
- Documented two cross-framework comparison points: VineJS's default validation-failure status is 422 (vs Nest's 400), and Bouncer policies/controllers are auto-indexed via codegen rather than manually registered.
- Coverage measured via `c8` (Japa has no built-in `--coverage` flag), documented in `AGENTS.md`'s Japa detection row.

## 0.1.0

- **Initial release.** `AGENTS.md` (core doctrine: detect stack, confirm Jest/Vitest, TypeScript strict + ESLint, plan-first `task-test.md`, persona matrix for permission-gated units, coverage floor, review gate), `docs/strategy.md`, `docs/conventions.md`, `.claude/skills/test-casebook-back-js/`, `.claude/agents/{test-writer-back-js,test-reviewer-back-js}`, the plan-gate hook, and `bin/casebook-back-js-init.mjs`.
- **Verified for real, not just documented**: a fresh NestJS project (TypeORM + `better-sqlite3` in-memory, Passport-JWT, Jest) with the same blog-idea scenario as the PHP-back doctrine's worked examples — roles (admin/author/member), a private article, scheduled publishing, comments with an owner notification. **40/40 tests green (9 unit + 31 e2e), `tsc --noEmit` clean under freshly-enabled `strict: true`, ESLint clean, 98.84% line coverage** (well above the 80% floor). See [`docs/testing-guide/nestjs.md`](docs/testing-guide/nestjs.md).
- Found and documented two real, non-obvious things running it surfaced that a by-analogy port from the PHP doctrine alone wouldn't have caught:
  - **A fresh NestJS CLI scaffold ships `strict: false`** (`strictNullChecks`, `noImplicitAny` both off) — enabling `strict: true` surfaced 26 real "has no initializer" errors on TypeORM entity/DTO properties (fixed with definite-assignment assertions, `title!: string`) and 3 errors from a TypeORM major-version API change (`relations: ['owner']` → `relations: { owner: true }`).
  - **A JWT's own `exp` is evaluated against the same faked clock an isolation test uses for business-logic scheduling.** Advancing `jest.setSystemTime()` forward to prove a scheduled-publish gate opens also silently expires any token minted before the jump — a genuinely new isolation-testing hazard with no PHP-back doctrine equivalent (Laravel's `actingAs()` test helper doesn't mint an expiring credential at all). Documented with the fix (re-mint the token after the jump).
- Also documented a coverage-measurement gotcha specific to Nest's scaffold: it ships two separate Jest configs (unit vs e2e), and collecting coverage from the unit-only config under-reports real coverage to near-0% when most business logic is only exercised through the e2e suite.
- Both the plan-gate hook and the `--coverage` scaffolder flag were tested for real against this demo and a scratch target project, respectively — not assumed to work by analogy with the PHP-back repo's own equivalents.
