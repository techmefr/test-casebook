# Strategy — why `test-casebook-back-js` is its own repo

Same doctrine as [`test-casebook`](https://github.com/techmefr/test-casebook) (frontend) and [`test-casebook-back`](https://github.com/techmefr/test-casebook-back) (PHP): plan first, exhaustive not happy-path, isolated and deterministic, dense permission matrix, independent review gate, enforced coverage floor. The question is why this is a **third** repo rather than folding into one of the other two.

## Why not merge into `test-casebook` (the JS frontend repo)

Both share npm and TypeScript, but nothing about the testing philosophy. `test-casebook` is built around component/UI/accessibility testing (Vitest + Testing Library + Playwright, DOM assertions, visual states). A Node backend has none of that — no component tree, no accessibility tree, no browser. What it does have — permission-gated units, a persona matrix, a coverage floor enforced against business logic rather than rendered output — is the same shape of problem `test-casebook-back` already solves for PHP, just with a different runner and package manager.

## Why not merge into `test-casebook-back` (the PHP backend repo)

The testing *philosophy* is close enough that this file and its sibling's `AGENTS.md` read almost like a translation of each other section by section. But the tooling has zero overlap: Composer vs npm, PHPUnit/Pest vs Jest/Vitest, Larastan/PHPStan vs `tsc`/ESLint, `spatie/laravel-permission` vs hand-rolled Nest Guards or CASL. A single `AGENTS.md` trying to cover both would need a conditional branch on every single command, which is exactly the "doc that fits neither" problem the PHP-back doctrine's own strategy doc already identified when it split off from the frontend repo.

## What's shared across all three repos, verbatim in spirit

- Plan first: `task-test.md` before any test file is written, enforced by a `PreToolUse` hook.
- Exhaustive, not happy-path: every branch, every validation rule, every permission gate.
- A persona matrix, weighted toward the refused cells, for every gated capability.
- Isolation and determinism: no wall-clock dependence, no real external calls, one seeded persona per test.
- An independent review gate before any test block is committed.
- A governance-owned coverage floor (default 80%), never silently lowered to make a suite pass.

## What's genuinely different here, verified for real

Building the first real worked example (NestJS, see [`docs/testing-guide/nestjs.md`](testing-guide/nestjs.md)) surfaced things a purely-by-analogy port from the PHP doctrine would have missed:

- A fresh NestJS CLI scaffold's `tsconfig.json` ships with `strictNullChecks: false` — the direct Node-ecosystem analogue of a fresh Laravel skeleton needing `AuthorizesRequests` added by hand. Neither ecosystem's "getting started" defaults match its own testing doctrine's bar.
- TypeORM entity/DTO properties need definite-assignment assertions (`title!: string`) under `strict` mode — a real compile error, not a false positive, the same way Larastan needed explicit generic PHPDoc on Eloquent relations.
- **JWTs carry their own expiry, evaluated against the same faked clock an isolation test uses to test business-logic scheduling.** Advancing `jest.setSystemTime()` forward to prove a scheduled-publish gate opens also silently expires any token minted before the jump — a genuinely new failure mode neither the front nor the PHP-back doctrine has an equivalent of, since Laravel's `actingAs()` test helper doesn't mint an expiring credential at all. Documented in `AGENTS.md` Step 4 and `nestjs.md`.
- A major-version ORM API change (TypeORM's `relations` option moving from a string array to an object shape) is caught immediately by `tsc --noEmit` under strict mode — reinforcing why Step 3 treats enabling strict mode as non-negotiable rather than a nice-to-have.
