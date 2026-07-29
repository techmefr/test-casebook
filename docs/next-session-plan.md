# Next session — split repos + start test-casebook-back-js

Picks up from [`architecture-decision.md`](architecture-decision.md). Concrete steps, in order:

## 1. Split `test-casebook-back` out into its own repo

- The content currently lives as the `back/` folder on the `back-doctrine-exploration` branch of this repo (`test-casebook`).
- Create a new `test-casebook-back` repo (empty, own history) and copy `back/`'s contents (`AGENTS.md`, `docs/`, `.claude/`, `bin/`, `README.md`, `CHANGELOG.md`) into its root — don't carry over this repo's git history, start clean since `back/` was always meant to become independent.
- Update `test-casebook`'s own `README.md` with a short "sibling repos" pointer to `test-casebook-back` (PHP) and `test-casebook-back-js` (JS) once both exist.
- Once copied and verified, the `back/` folder and `back-doctrine-exploration` branch in this repo can be deleted.

## 2. Create `test-casebook-back-js`

Same doctrine as `test-casebook-back`, ported to the JS/TS backend ecosystem instead of PHP — npm instead of Composer, Vitest/Jest instead of PHPUnit/Pest, no static frontend concerns (no component testing, no accessibility, no Playwright — that stays in `test-casebook`).

Base scaffold to bring over conceptually from `test-casebook-back` (adapt, don't copy verbatim):
- `AGENTS.md` — same core steps (detect stack, confirm runner, static analysis if present, plan-first `task-test.md`, persona matrix, coverage floor, review gate), detection table becomes: `NestJS`/`AdonisJS`/`Express` (framework), `vitest`/`jest` (runner, detect from `package.json`), `eslint`/`typescript strict mode` (the tsc-equivalent gate), a permission/auth library per framework (Nest Guards, Adonis Bouncer/policies, or whatever Express project actually uses — likely bespoke middleware, don't assume a package).
- `.claude/skills/test-casebook-back-js/` + `.claude/agents/{test-writer-back-js,test-reviewer-back-js}`.
- `.claude/hooks/test-casebook-back-js-gate.mjs` — same plan-gate logic as the PHP one, just re-pointed at this ecosystem's test file naming convention (confirm exact pattern once the first framework is chosen — likely `*.spec.ts` or `*.test.ts` under `tests/` or colocated, needs checking per framework rather than assumed).
- `bin/casebook-back-js-init.mjs` (or `.ts`) — scaffolder, same `--coverage=<n>` flag pattern.
- `docs/strategy.md`, `docs/conventions.md`.
- `docs/testing-guide/<framework>.md` per framework, starting with whichever is picked first (Nest, Adonis, or Express).

## 3. First framework worked example

Same rigor as the PHP side — a real project, run for real in Docker (or directly if Node is available on the host, unlike PHP), a persona matrix (roles/guards), validation, isolation cases, coverage measured for real, not assumed.

## Open question for next session

Which framework first — NestJS, AdonisJS, or Express? Decided together or left to whoever picks this up (the user's own Claude Code session, per today's plan).
